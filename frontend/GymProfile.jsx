import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import BrandFooter from "./BrandFooter.jsx";
import CommunicationBroadcast from "./CommunicationBroadcast.jsx";
import { communicationsApi } from "./communicationsApi.js";
import { paymentsV2Api } from "./paymentsV2Api.js";
import { qrcode } from "./qr-lib.js";
import { 
  Building2, 
  Upload, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Instagram, 
  Facebook, 
  Youtube, 
  Twitter, 
  Linkedin, 
  ShieldCheck,
  Shield,
  ArrowRight,
  Clock, 
  Settings, 
  Users, 
  Zap, 
  Search, 
  Save, 
  ChevronRight, 
  ChevronLeft, 
  MoreHorizontal, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff,
  HelpCircle, 
  Activity, 
  Smartphone, 
  FileText,
  BadgeCheck,
  CheckCircle2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  QrCode,
  Palette,
  Share2,
  Sliders,
  Lock,
  Download,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Layers,
  ShieldAlert,
  Award,
  Camera,
  Calendar,
  Image as ImageIcon,
  X,
  Navigation,
  Map,
  Hash,
  FileBadge,
  CreditCard,
  Receipt,
  Percent,
  Timer,
  Apple,
  Play,
  Link2,
  User,
  Quote,
  ChevronDown,
  PhoneCall,
  MessageSquare,
  Send,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  Wallet,
  Ban,
  Coins,
  KeyRound,
  FileCheck2,
  ShieldOff,
  Network,
  LockKeyhole
} from "lucide-react";
import jsPDF from "jspdf";

/**
 * CUSTOM DESIGNED ENTERPRISE DROPDOWN MENU
 * Clean, tactile, monochromatic design with keyboard navigation & spring animations
 */
const CustomDropdown = ({
  id,
  icon: Icon,
  value,
  placeholder = "Select an option...",
  options = [],
  onChange,
  disabled = false,
  className = "",
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) setSearchTerm("");
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => 
    typeof opt === "string" ? opt === value : opt.value === value
  );

  const displayLabel = selectedOption 
    ? (typeof selectedOption === "string" ? selectedOption : selectedOption.label)
    : "";

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => {
      const val = typeof opt === "string" ? opt : (opt.label || opt.value || "");
      const desc = typeof opt === "object" && opt.description ? opt.description : "";
      return val.toLowerCase().includes(term) || desc.toLowerCase().includes(term);
    });
  }, [options, searchable, searchTerm]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 pl-10 pr-3.5 bg-zinc-50 border rounded-lg text-xs font-semibold flex items-center justify-between text-left transition-all cursor-pointer ${
          isOpen 
            ? "bg-white border-zinc-900 ring-2 ring-zinc-900 shadow-sm" 
            : "border-zinc-200 hover:bg-zinc-100/70 hover:border-zinc-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Icon size={15} strokeWidth={1.5} />
          </div>
        )}

        <span className={`truncate flex-1 pr-2 ${displayLabel ? "text-zinc-900 font-semibold" : "text-zinc-400 font-normal"}`}>
          {displayLabel || placeholder}
        </span>

        <ChevronDown 
          size={14} 
          strokeWidth={2} 
          className={`shrink-0 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-zinc-800" : ""}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl shadow-zinc-900/10 overflow-hidden py-1.5 max-h-64 overflow-y-auto"
            style={{ minWidth: "220px" }}
            role="listbox"
          >
            {searchable && (
              <div className="px-2 pt-1 pb-2 border-b border-zinc-100">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
                    <Search size={13} strokeWidth={1.75} />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search options..."
                    className="w-full h-8 pl-8 pr-2.5 bg-zinc-50 border border-zinc-200 rounded-md text-xs font-medium focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-zinc-400 font-normal">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optValue = typeof opt === "string" ? opt : opt.value;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                const optDesc = typeof opt === "object" ? opt.description : null;
                const optBadge = typeof opt === "object" ? opt.badge : null;
                const isSelected = optValue === value;

                return (
                  <div
                    key={optValue || idx}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(optValue);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 mx-1.5 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected 
                        ? "bg-zinc-900 text-white font-medium" 
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold truncate">{optLabel}</span>
                        {optBadge && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isSelected ? "bg-white/20 text-white" : "bg-zinc-200/70 text-zinc-600"}`}>
                            {optBadge}
                          </span>
                        )}
                      </div>
                      {optDesc && (
                        <span className={`text-[10px] leading-tight mt-0.5 truncate ${isSelected ? "text-zinc-300" : "text-zinc-400"}`}>
                          {optDesc}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={14} strokeWidth={2.5} className="shrink-0 text-white ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * BANKING & SETTLEMENT CONFIGURATION CONSTANTS
 */
const BANK_OPTIONS = [
  { value: "HDFC Bank", label: "HDFC Bank", description: "Scheduled Commercial Bank • Instant IMPS/NEFT/RTGS", badge: "Primary Rail" },
  { value: "ICICI Bank", label: "ICICI Bank", description: "Scheduled Commercial Bank • Real-time API Settlement", badge: "Primary Rail" },
  { value: "State Bank of India", label: "State Bank of India (SBI)", description: "Public Sector Scheduled Commercial Bank", badge: "Govt Rail" },
  { value: "Axis Bank", label: "Axis Bank", description: "Scheduled Commercial Bank • Corporate Banking Portal", badge: "Verified Rail" },
  { value: "Kotak Mahindra Bank", label: "Kotak Mahindra Bank", description: "Scheduled Commercial Bank • Instant Payouts", badge: "Verified Rail" },
  { value: "Punjab National Bank", label: "Punjab National Bank (PNB)", description: "Public Sector Scheduled Commercial Bank", badge: "Govt Rail" },
  { value: "Bank of Baroda", label: "Bank of Baroda", description: "Public Sector Scheduled Commercial Bank", badge: "Govt Rail" },
  { value: "IndusInd Bank", label: "IndusInd Bank", description: "Scheduled Commercial Bank • Commercial Banking", badge: "Verified Rail" },
  { value: "Federal Bank", label: "Federal Bank", description: "Scheduled Commercial Bank • Neo-Banking Partner", badge: "Verified Rail" },
  { value: "Yes Bank", label: "Yes Bank", description: "Scheduled Commercial Bank • High-Volume UPI Rails", badge: "UPI Gateway" },
  { value: "IDFC FIRST Bank", label: "IDFC FIRST Bank", description: "Scheduled Commercial Bank • Fast IMPS Settlement", badge: "Verified Rail" },
  { value: "Other Scheduled Bank", label: "Other Scheduled Commercial Bank", description: "Any RBI-regulated Commercial Bank in India", badge: "Standard" }
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "Current Account", label: "Current Account", description: "Recommended for Fitness Centers, Gyms, and LLPs", badge: "Business" },
  { value: "Savings Account", label: "Savings Account", description: "For Sole Proprietorships and Individual Gym Trainers", badge: "Personal" },
  { value: "Overdraft (OD) / CC", label: "Overdraft (OD) / Cash Credit (CC)", description: "Commercial facility account for high-volume cashflows", badge: "Credit Line" },
  { value: "Virtual Escrow Node", label: "Virtual Escrow Node", description: "Sub-merchant routing node for auto-split settlement", badge: "Multi-branch" }
];

const ROLE_OPTIONS = [
  { value: "inflow", label: "Member Fee Collection (Inflow)", description: "Where gym members pay subscription dues and packages", badge: "Inflow" },
  { value: "outflow", label: "Trainer Payroll & Outflow", description: "Account used to disburse trainer salaries and vendor bills", badge: "Outflow" },
  { value: "both", label: "Dual Purpose (Inflow + Outflow)", description: "Single consolidated account for both receipts and payouts", badge: "Unified" }
];

/**
 * AUTHENTIC SCANNABLE NPCI UPI 2.0 QR CODE GENERATOR (Pure Vector SVG)
 */
const UpiQrCodeSvg = ({ vpa, name, size = 210 }) => {
  const qrSvgString = useMemo(() => {
    if (!vpa) return null;
    try {
      const payeeName = encodeURIComponent((name || "Merchant").trim());
      const uri = `upi://pay?pa=${vpa.trim()}&pn=${payeeName}&cu=INR`;
      const qr = qrcode(0, "M");
      qr.addData(uri);
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
  }, [vpa, name]);

  if (!qrSvgString) {
    return (
      <div 
        className="relative inline-flex items-center justify-center bg-white p-3.5 rounded-2xl border border-zinc-200/90 shadow-sm text-zinc-400 select-none"
        style={{ width: size, height: size }}
      >
        <QrCode size={48} />
      </div>
    );
  }

  return (
    <div 
      className="relative inline-block bg-white p-3.5 rounded-2xl border border-zinc-200/90 shadow-sm select-none"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: qrSvgString }}
    />
  );
};

/**
 * REUSABLE TOGGLE SWITCH & CHECK BUTTON COMPONENTS
 * Modern controls for managing communication channel activation & member permissions
 */
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button 
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-zinc-900' : 'bg-zinc-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span 
      aria-hidden="true" 
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`} 
    />
  </button>
);

const CheckButton = ({ checked, onChange, label, description, icon: Icon, disabled = false }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onChange}
    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 select-none ${
      disabled 
        ? 'opacity-40 cursor-not-allowed bg-zinc-50 border-zinc-200 text-zinc-400' 
        : checked 
          ? 'bg-zinc-900/5 border-zinc-900/40 text-zinc-900 cursor-pointer shadow-2xs' 
          : 'bg-zinc-50/60 border-zinc-200/80 hover:border-zinc-300 text-zinc-600 cursor-pointer'
    }`}
  >
    <div className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
      checked ? 'bg-zinc-900 text-white shadow-2xs' : 'border border-zinc-300 bg-white'
    }`}>
      {checked && <Check size={12} strokeWidth={2.5} />}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} className={checked ? 'text-zinc-900' : 'text-zinc-400'} />}
        <span className={`text-xs font-semibold ${checked ? 'text-zinc-900' : 'text-zinc-700'}`}>{label}</span>
      </div>
      {description && (
        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
      )}
    </div>
  </button>
);

/**
 * GYMDECK • GYM PROFILE & OPERATIONAL CONFIGURATION
 * Professional Monochromatic Enterprise Edition
 */

const GymProfile = () => {
  const [activeTab, setActiveTab] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isExportingCert, setIsExportingCert] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // Banking & Settlement State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [modalStep, setModalStep] = useState(1);
  const [isCardGatewayModalOpen, setIsCardGatewayModalOpen] = useState(false);
  const [bankingFilter, setBankingFilter] = useState("all"); // "all" | "inflow" | "outflow"
  const [accountFormData, setAccountFormData] = useState({
    purpose: "inflow", // "inflow" | "outflow" | "both"
    method: "UPI", // "UPI" | "BANK_TRANSFER" | "COMBINED" | "CARD_GATEWAY"
    label: "",
    accountHolderName: "",
    bankName: "HDFC Bank",
    accountNumber: "",
    confirmAccountNumber: "",
    ifscCode: "",
    branchName: "",
    accountType: "Current Account",
    upiId: "",
    role: "inflow",
    isPrimaryInflow: false,
    isPrimaryOutflow: false,
    gatewayProvider: "Razorpay"
  });
  const [accountFormErrors, setAccountFormErrors] = useState({});
  const [isUpiQrModalOpen, setIsUpiQrModalOpen] = useState(false);
  const [selectedQrAccount, setSelectedQrAccount] = useState(null);
  const [revealedAccountIds, setRevealedAccountIds] = useState(new Set());
  const [copiedUpiId, setCopiedUpiId] = useState(null);
  const [copiedAccNum, setCopiedAccNum] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [expandedFaqId, setExpandedFaqId] = useState(null);
  const toggleFaq = (id) => setExpandedFaqId(prev => (prev === id ? null : prev === "all" ? null : id));

  // Close Export Menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [isExportMenuOpen]);

  // Listen for Escape key to close modals & lock background scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsQrModalOpen(false);
        setIsAccountModalOpen(false);
        setIsUpiQrModalOpen(false);
        setAccountToDelete(null);
      }
    };
    if (isQrModalOpen || isAccountModalOpen || isUpiQrModalOpen || accountToDelete) {
      window.addEventListener("keydown", handleKeyDown);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isQrModalOpen, isAccountModalOpen, isUpiQrModalOpen, accountToDelete]);

  // File Input References
  const bannerInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // State for Gym Identity & Settings (Clean empty state; placeholders provide guidance until real data is entered)
  const [gymData, setGymData] = useState({
    // General
    name: "",
    tagline: "",
    description: "",
    foundedYear: "",
    businessType: "",
    
    // Contact & Member Communication Channels
    primaryPhone: "",
    mobileForMembers: true,
    mobileSmsAllowed: true,
    mobileCallsAllowed: true,
    mobilePromosAllowed: false,

    whatsapp: "",
    whatsappForMembers: true,
    whatsappReceiptsAllowed: true,
    whatsappRemindersAllowed: true,
    whatsappSupportAllowed: true,
    whatsappPromosAllowed: false,

    email: "",
    emailForMembers: true,
    emailInvoicesAllowed: true,
    emailAlertsAllowed: true,
    emailNewsletterAllowed: false,

    // Operational quiet hours (used by assisted broadcast policy)
    quietHoursStart: "22:00",
    quietHoursEnd: "06:00",

    // Facility Location & Coordinates
    website: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    
    // Business Information
    gst: "",
    regNo: "",
    legalName: "",
    pan: "",
    entityType: "",
    billingCurrency: "INR (₹)",
    invoicePrefix: "",
    taxRate: "",

    // Visual Branding & Images (clean mock states)
    logoUrl: null, 
    coverImageUrl: null, 
    primaryColor: "#0F172A",
    accentColor: "#334155",
    secondaryColor: "#10B981",
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Inter",
    watermarkReceipts: true,

    // Operational Settings
    openingHours: "",
    closingHours: "",
    weekendOpening: "",
    weekendClosing: "",
    slotCapacity: "",
    slotDurationMinutes: "",
    autoHolidayClosure: true,

    // Web Portal & Subdomain (Used for member check-in & passes)
    subdomain: "",
    customDomain: "",

    // Banking, Settlement & Payout Accounts
    bankAccounts: [],

    // Social Media
    socials: {
      instagram: "",
      facebook: "",
      youtube: "",
      twitter: "",
      linkedin: ""
    },

    // Public Profile / Flags
    isPubliclyActive: true,
    seoTitle: "",
    seoDescription: "",
    slug: "",
    amenities: [],

    // Security & Compliance
    twoFactorStaff: false,
    maskSensitiveData: true,
    ipWhitelisting: false,
    sessionTimeoutMins: "30",

    // Verification & Enterprise
    isEnterpriseReady: false,
    complianceScore: 0,
    verificationStatus: "Pending",
    verifiedDate: null,

    // Branches (Empty array by default)
    branches: [],

    // Advanced
    apiKey: "",
    webhookUrl: "",
    autoBackups: true
  });

  // Hydrate persisted communication settings from the cloud tenant record.
  useEffect(() => {
    let cancelled = false;
    communicationsApi.getSettings()
      .then((res) => {
        if (cancelled || !res?.data) return;
        const s = res.data;
        setGymData((prev) => ({
          ...prev,
          primaryPhone: s.primaryPhone || "",
          whatsapp: s.whatsappNumber || "",
          email: s.officialEmail || "",
          mobileForMembers: s.mobileForMembers,
          mobileSmsAllowed: s.mobileSmsAllowed,
          mobileCallsAllowed: s.mobileCallsAllowed,
          mobilePromosAllowed: s.mobilePromosAllowed,
          whatsappForMembers: s.whatsappForMembers,
          whatsappReceiptsAllowed: s.whatsappReceiptsAllowed,
          whatsappRemindersAllowed: s.whatsappRemindersAllowed,
          whatsappSupportAllowed: s.whatsappSupportAllowed,
          whatsappPromosAllowed: s.whatsappPromosAllowed,
          emailForMembers: s.emailForMembers,
          emailInvoicesAllowed: s.emailInvoicesAllowed,
          emailAlertsAllowed: s.emailAlertsAllowed,
          emailNewsletterAllowed: s.emailNewsletterAllowed,
          quietHoursStart: s.quietHoursStart || "22:00",
          quietHoursEnd: s.quietHoursEnd || "06:00",
        }));
      })
      .catch(() => { /* Offline / unenrolled: keep local defaults. */ });
    return () => { cancelled = true; };
  }, []);

  // Hydrate persisted receiving accounts from cloud database
  useEffect(() => {
    let cancelled = false;
    paymentsV2Api.listAccounts()
      .then((res) => {
        if (cancelled || !res?.data?.accounts) return;
        const apiAccounts = res.data.accounts;
        if (apiAccounts.length > 0) {
          setGymData((prev) => ({
            ...prev,
            bankAccounts: apiAccounts.map((a) => ({
              id: a.id,
              accountHolderName: a.beneficiaryName,
              bankName: a.bankName || "Bank",
              accountNumber: a.accountNumberMasked || "",
              ifscCode: a.ifscCode || "",
              branchName: a.branchName || "",
              accountType: a.accountType || "Current Account",
              upiId: a.upiVpa || "",
              role: a.isPrimary ? "both" : "inflow",
              isPrimaryInflow: !!a.isPrimary,
              isPrimaryOutflow: !!a.isPrimary,
              verificationStatus: a.status || "UNVERIFIED",
              addedAt: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            })),
          }));
        }
      })
      .catch(() => { /* Offline / unenrolled: keep local defaults. */ });
    return () => { cancelled = true; };
  }, []);

  // Focused List of Tabs in the Horizontal Navigation Row
  const tabs = useMemo(() => [
    { id: "General", label: "General", icon: Building2 },
    { id: "Contact & Communication", label: "Contact & Communication", icon: MessageSquare },
    { id: "Branches", label: "Branches", icon: MapPin },
    { id: "QR Passes", label: "QR Passes", icon: QrCode },
    { id: "Operational Settings", label: "Operational Settings", icon: Clock },
    { id: "Banking & Settlement", label: "Banking & Settlement", icon: Landmark },
    { id: "Social Media", label: "Social Media", icon: Share2 }
  ], []);

  // Verified Enterprise badge appears only after all placeholder details in the header are entered by the user
  const isAllDetailsEntered = useMemo(() => Boolean(
    gymData.name?.trim() &&
    gymData.tagline?.trim() &&
    (gymData.city?.trim() || gymData.state?.trim()) &&
    gymData.businessType?.trim() &&
    gymData.foundedYear?.trim()
  ), [gymData.name, gymData.tagline, gymData.city, gymData.state, gymData.businessType, gymData.foundedYear]);

  // Auto-switch to tab if search query matches a tab name or keyword
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    const matched = tabs.find(t => 
      t.label.toLowerCase().includes(q) || 
      t.id.toLowerCase().includes(q) ||
      (t.id === "Banking & Settlement" && (
        q.includes("bank") || q.includes("upi") || q.includes("payout") || 
        q.includes("settle") || q.includes("salary") || q.includes("fee") || q.includes("account")
      ))
    );
    if (matched && matched.id !== activeTab) {
      setActiveTab(matched.id);
    }
  }, [searchQuery, tabs, activeTab]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Banking Account Actions
  const handleToggleRevealAccount = (id) => {
    setRevealedAccountIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyText = (text, type, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "upi") {
      setCopiedUpiId(id);
      setTimeout(() => setCopiedUpiId(null), 2000);
      showToast("UPI VPA copied to clipboard.");
    } else {
      setCopiedAccNum(id);
      setTimeout(() => setCopiedAccNum(null), 2000);
      showToast("Account number copied to clipboard.");
    }
  };

  const handleSetPrimaryInflow = (id) => {
    if (id && !id.startsWith("acc_")) {
      paymentsV2Api.setPrimary(id).catch(console.warn);
    }
    setGymData(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map(acc => {
        const isTarget = acc.id === id;
        const willBePrimaryInflow = isTarget;
        const willBePrimaryOutflow = isTarget ? acc.isPrimaryOutflow : (acc.isPrimaryOutflow ? true : false);
        let newRole = acc.role;
        if (isTarget) {
          newRole = willBePrimaryOutflow ? "both" : "inflow";
        } else if (acc.isPrimaryOutflow) {
          newRole = "outflow";
        }
        return {
          ...acc,
          isPrimaryInflow: willBePrimaryInflow,
          role: newRole
        };
      })
    }));
    setHasChanges(true);
    const target = (gymData.bankAccounts || []).find(a => a.id === id);
    showToast(`Designated ${target?.bankName || "account"} as primary Fee Inflow destination.`);
  };

  const handleSetPrimaryOutflow = (id) => {
    if (id && !id.startsWith("acc_")) {
      paymentsV2Api.setPrimary(id).catch(console.warn);
    }
    setGymData(prev => ({
      ...prev,
      bankAccounts: (prev.bankAccounts || []).map(acc => {
        const isTarget = acc.id === id;
        const willBePrimaryOutflow = isTarget;
        const willBePrimaryInflow = isTarget ? acc.isPrimaryInflow : (acc.isPrimaryInflow ? true : false);
        let newRole = acc.role;
        if (isTarget) {
          newRole = willBePrimaryInflow ? "both" : "outflow";
        } else if (acc.isPrimaryInflow) {
          newRole = "inflow";
        }
        return {
          ...acc,
          isPrimaryOutflow: willBePrimaryOutflow,
          role: newRole
        };
      })
    }));
    setHasChanges(true);
    const target = (gymData.bankAccounts || []).find(a => a.id === id);
    showToast(`Designated ${target?.bankName || "account"} as primary Trainer Payroll source.`);
  };

  const openAddAccountModal = (defaultPurpose = "inflow", defaultMethod = null) => {
    setEditingAccountId(null);
    setModalStep(defaultMethod ? 3 : 1);
    const purpose = defaultPurpose === "outflow" ? "outflow" : defaultPurpose === "both" ? "both" : "inflow";
    const method = defaultMethod || (purpose === "outflow" ? "BANK_TRANSFER" : "UPI");
    setAccountFormData({
      purpose,
      method,
      label: "",
      accountHolderName: gymData.legalName || gymData.name || "",
      bankName: "HDFC Bank",
      accountNumber: "",
      confirmAccountNumber: "",
      ifscCode: "",
      branchName: "",
      accountType: "Current Account",
      upiId: "",
      role: purpose,
      isPrimaryInflow: purpose !== "outflow" || (gymData.bankAccounts || []).length === 0,
      isPrimaryOutflow: purpose === "outflow" || purpose === "both",
      gatewayProvider: "Razorpay"
    });
    setAccountFormErrors({});
    setIsAccountModalOpen(true);
  };

  const openEditAccountModal = (account) => {
    setEditingAccountId(account.id);
    const isUpi = Boolean(account.upiId && !account.accountNumber);
    const isBank = Boolean(!account.upiId && account.accountNumber);
    const isCombined = Boolean(account.upiId && account.accountNumber);
    const method = isUpi ? "UPI" : isBank ? "BANK_TRANSFER" : isCombined ? "COMBINED" : "BANK_TRANSFER";
    const purpose = account.role || (account.isPrimaryOutflow && !account.isPrimaryInflow ? "outflow" : account.isPrimaryInflow && !account.isPrimaryOutflow ? "inflow" : "both");
    
    setAccountFormData({
      purpose,
      method,
      label: account.label || "",
      accountHolderName: account.accountHolderName || account.beneficiaryName || "",
      bankName: account.bankName || "HDFC Bank",
      accountNumber: account.accountNumber || "",
      confirmAccountNumber: account.accountNumber || "",
      ifscCode: account.ifscCode || "",
      branchName: account.branchName || "",
      accountType: account.accountType || "Current Account",
      upiId: account.upiId || "",
      role: purpose,
      isPrimaryInflow: Boolean(account.isPrimaryInflow),
      isPrimaryOutflow: Boolean(account.isPrimaryOutflow),
      gatewayProvider: "Razorpay"
    });
    setModalStep(3); // Start on details step for editing, but can navigate Back
    setAccountFormErrors({});
    setIsAccountModalOpen(true);
  };

  const validateStep3 = () => {
    const errors = {};
    const method = accountFormData.method;
    const isMaskedAcc = (accountFormData.accountNumber || "").includes("•");

    if (method === "CARD_GATEWAY") {
      // Card Gateway is provider-hosted - no raw card details to validate
      return true;
    }

    if (!accountFormData.accountHolderName.trim()) {
      errors.accountHolderName = "Account holder / Beneficiary name is required";
    }

    if (method === "UPI" || method === "COMBINED") {
      if (!accountFormData.upiId.trim()) {
        errors.upiId = "UPI ID / VPA is required (e.g. gym@okhdfcbank)";
      } else if (!accountFormData.upiId.includes("@") || accountFormData.upiId.trim().length < 5) {
        errors.upiId = "Invalid UPI VPA (must contain '@', e.g. name@bank)";
      }
    }

    if (method === "BANK_TRANSFER" || method === "COMBINED") {
      if (!accountFormData.accountNumber.trim()) {
        errors.accountNumber = "Account number is required";
      } else if (!isMaskedAcc && !/^\d{9,18}$/.test(accountFormData.accountNumber.replace(/\s+/g, ""))) {
        errors.accountNumber = "Account number must be 9-18 digits";
      }
      if (!isMaskedAcc && accountFormData.accountNumber !== accountFormData.confirmAccountNumber) {
        errors.confirmAccountNumber = "Account numbers do not match";
      }
      if (!accountFormData.ifscCode.trim()) {
        errors.ifscCode = "IFSC code is required";
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(accountFormData.ifscCode.trim().toUpperCase())) {
        errors.ifscCode = "Invalid IFSC format (e.g. HDFC0000240)";
      }
    }

    setAccountFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (modalStep === 1) {
      setModalStep(2);
    } else if (modalStep === 2) {
      setModalStep(3);
    } else if (modalStep === 3) {
      if (validateStep3()) {
        setAccountFormErrors({});
        setModalStep(4);
      }
    }
  };

  const handlePrevStep = () => {
    if (modalStep > 1) {
      setAccountFormErrors({});
      setModalStep(prev => prev - 1);
    }
  };

  const handleSaveAccountForm = () => {
    if (!validateStep3()) {
      setModalStep(3);
      return;
    }

    const method = accountFormData.method;
    const purpose = accountFormData.purpose;
    const isMaskedAcc = (accountFormData.accountNumber || "").includes("•");
    const cleanedIfsc = (accountFormData.ifscCode || "").trim().toUpperCase();
    const isPrimaryInflow = accountFormData.isPrimaryInflow || purpose === "inflow" || purpose === "both";
    const isPrimaryOutflow = accountFormData.isPrimaryOutflow || purpose === "outflow" || purpose === "both";

    if (method === "CARD_GATEWAY") {
      showToast("Card Gateway status registered (Provider: Razorpay · Coming Soon).");
      setIsAccountModalOpen(false);
      return;
    }

    const isUpiActive = method === "UPI" || method === "COMBINED";
    const isBankActive = method === "BANK_TRANSFER" || method === "COMBINED";

    if (editingAccountId) {
      setGymData(prev => ({
        ...prev,
        bankAccounts: (prev.bankAccounts || []).map(acc => {
          if (acc.id === editingAccountId) {
            return {
              ...acc,
              accountHolderName: accountFormData.accountHolderName.trim(),
              bankName: isBankActive ? accountFormData.bankName : null,
              accountNumber: isBankActive ? (isMaskedAcc ? acc.accountNumber : accountFormData.accountNumber.trim()) : null,
              ifscCode: isBankActive ? cleanedIfsc : null,
              branchName: isBankActive ? (accountFormData.branchName.trim() || `${accountFormData.bankName} Main Branch`) : null,
              accountType: isBankActive ? accountFormData.accountType : null,
              upiId: isUpiActive ? accountFormData.upiId.trim() : null,
              role: purpose,
              methodType: method,
              isPrimaryInflow: isPrimaryInflow,
              isPrimaryOutflow: isPrimaryOutflow
            };
          }
          return {
            ...acc,
            isPrimaryInflow: isPrimaryInflow ? false : acc.isPrimaryInflow,
            isPrimaryOutflow: isPrimaryOutflow ? false : acc.isPrimaryOutflow
          };
        })
      }));

      // Asynchronously update in cloud backend
      if (!editingAccountId.startsWith("acc_")) {
        const updatePayload = {
          beneficiaryName: accountFormData.accountHolderName.trim(),
          bankName: isBankActive ? accountFormData.bankName : undefined,
          accountType: isBankActive ? accountFormData.accountType : undefined,
          ifscCode: isBankActive ? cleanedIfsc : undefined,
          branchName: isBankActive ? (accountFormData.branchName.trim() || `${accountFormData.bankName} Main Branch`) : undefined,
          upiVpa: isUpiActive ? accountFormData.upiId.trim() : undefined,
        };
        if (isBankActive && !isMaskedAcc) {
          updatePayload.accountNumber = accountFormData.accountNumber.trim();
          updatePayload.confirmAccountNumber = accountFormData.confirmAccountNumber.trim();
        }
        paymentsV2Api.updateAccount(editingAccountId, updatePayload)
          .then((res) => {
            if (res?.data?.account) {
              setGymData(prev => ({
                ...prev,
                bankAccounts: (prev.bankAccounts || []).map(acc =>
                  acc.id === editingAccountId ? {
                    ...acc,
                    accountNumber: res.data.account.accountNumberMasked || acc.accountNumber,
                    verificationStatus: res.data.account.status || acc.verificationStatus
                  } : acc
                )
              }));
            }
          })
          .catch((err) => console.warn("Failed to persist account update to cloud:", err));

        if (isPrimaryInflow) {
          paymentsV2Api.setPrimary(editingAccountId).catch(console.warn);
        }
      }

      showToast("Payment destination updated successfully.");
    } else {
      const newAcc = {
        id: `acc_${Date.now()}`,
        accountHolderName: accountFormData.accountHolderName.trim(),
        bankName: isBankActive ? accountFormData.bankName : null,
        accountNumber: isBankActive ? accountFormData.accountNumber.trim() : null,
        ifscCode: isBankActive ? cleanedIfsc : null,
        branchName: isBankActive ? (accountFormData.branchName.trim() || `${accountFormData.bankName} Main Branch`) : null,
        accountType: isBankActive ? accountFormData.accountType : null,
        upiId: isUpiActive ? accountFormData.upiId.trim() : null,
        role: purpose,
        methodType: method,
        isPrimaryInflow: isPrimaryInflow,
        isPrimaryOutflow: isPrimaryOutflow,
        verificationStatus: "UNVERIFIED",
        addedAt: new Date().toISOString().split("T")[0]
      };

      setGymData(prev => ({
        ...prev,
        bankAccounts: [
          ...(prev.bankAccounts || []).map(acc => ({
            ...acc,
            isPrimaryInflow: isPrimaryInflow ? false : acc.isPrimaryInflow,
            isPrimaryOutflow: isPrimaryOutflow ? false : acc.isPrimaryOutflow
          })),
          newAcc
        ]
      }));

      // Asynchronously persist to backend database
      paymentsV2Api.createAccount({
        method: method === "UPI" ? "UPI" : "BANK_TRANSFER",
        label: method === "UPI" ? "Countertop Merchant UPI" : `${accountFormData.bankName} Account`,
        beneficiaryName: accountFormData.accountHolderName.trim(),
        upiVpa: isUpiActive ? accountFormData.upiId.trim() : undefined,
        bankName: isBankActive ? accountFormData.bankName : undefined,
        accountType: isBankActive ? accountFormData.accountType : undefined,
        accountNumber: isBankActive ? accountFormData.accountNumber.trim() : undefined,
        confirmAccountNumber: isBankActive ? accountFormData.confirmAccountNumber.trim() : undefined,
        ifscCode: isBankActive ? cleanedIfsc : undefined,
        branchName: isBankActive ? (accountFormData.branchName.trim() || `${accountFormData.bankName} Main Branch`) : undefined,
        isPrimary: isPrimaryInflow
      }).then((res) => {
        if (res?.data?.account?.id) {
          setGymData(prev => ({
            ...prev,
            bankAccounts: (prev.bankAccounts || []).map(acc => 
              acc.id === newAcc.id ? { ...acc, id: res.data.account.id, verificationStatus: res.data.account.status || "UNVERIFIED" } : acc
            )
          }));
        }
      }).catch((err) => {
        console.warn("Failed to persist receiving account to cloud:", err);
      });

      const methodLabel = method === "UPI" ? "UPI destination" : method === "BANK_TRANSFER" ? "Bank account" : "Dual-rail account";
      showToast(`New ${methodLabel} connected (Status: UNVERIFIED).`);
    }

    setHasChanges(true);
    setIsAccountModalOpen(false);
  };

  const handleDeleteAccount = (id) => {
    if (id && !id.startsWith("acc_")) {
      paymentsV2Api.deactivateAccount(id).catch(console.warn);
    }
    const remaining = (gymData.bankAccounts || []).filter(a => a.id !== id);
    if (remaining.length === 0) {
      setGymData(prev => ({ ...prev, bankAccounts: [] }));
      setHasChanges(true);
      setAccountToDelete(null);
      showToast("Financial account disconnected.");
      return;
    }

    let updated = [...remaining];
    const deletedAcc = (gymData.bankAccounts || []).find(a => a.id === id);
    if (deletedAcc?.isPrimaryInflow && updated.length > 0) {
      updated[0] = { ...updated[0], isPrimaryInflow: true };
    }
    if (deletedAcc?.isPrimaryOutflow && updated.length > 0) {
      const outflowTarget = updated.find(a => a.role === "outflow" || a.role === "both") || updated[0];
      outflowTarget.isPrimaryOutflow = true;
    }

    setGymData(prev => ({ ...prev, bankAccounts: updated }));
    setHasChanges(true);
    setAccountToDelete(null);
    showToast("Financial account disconnected.");
  };

  const primaryInflowAccount = useMemo(() => {
    const accounts = gymData.bankAccounts || [];
    return accounts.find(a => a.isPrimaryInflow) || accounts.find(a => a.role === "inflow" || a.role === "both") || accounts[0] || null;
  }, [gymData.bankAccounts]);

  const primaryOutflowAccount = useMemo(() => {
    const accounts = gymData.bankAccounts || [];
    return accounts.find(a => a.isPrimaryOutflow) || accounts.find(a => a.role === "outflow" || a.role === "both") || accounts[1] || accounts[0] || null;
  }, [gymData.bankAccounts]);

  const primaryUpiAccount = useMemo(() => {
    const accounts = gymData.bankAccounts || [];
    const upiAccounts = accounts.filter(a => a.upiId && a.verificationStatus !== "DISABLED");
    return upiAccounts.find(a => a.isPrimaryInflow) || upiAccounts[0] || null;
  }, [gymData.bankAccounts]);

  const primaryBankInflowAccount = useMemo(() => {
    const accounts = gymData.bankAccounts || [];
    const bankAccounts = accounts.filter(a => a.accountNumber && a.verificationStatus !== "DISABLED");
    return bankAccounts.find(a => a.isPrimaryInflow) 
      || bankAccounts.find(a => a.role === "inflow" || a.role === "both") 
      || bankAccounts[0] || null;
  }, [gymData.bankAccounts]);

  const primaryPayrollAccount = useMemo(() => {
    const accounts = gymData.bankAccounts || [];
    const bankAccounts = accounts.filter(a => a.accountNumber && a.verificationStatus !== "DISABLED");
    return bankAccounts.find(a => a.isPrimaryOutflow) 
      || bankAccounts.find(a => a.role === "outflow" || a.role === "both") 
      || bankAccounts[0] || null;
  }, [gymData.bankAccounts]);

  const handleInputChange = (field, value) => {
    setGymData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSocialChange = (platform, value) => {
    setGymData(prev => ({
      ...prev,
      socials: { ...prev.socials, [platform]: value }
    }));
    setHasChanges(true);
  };

  // Live Cover Banner Image Upload Handler
  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('coverImageUrl', imageUrl);
      showToast("Cover banner updated successfully.");
    }
  };

  // Live Profile Logo Image Upload Handler
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('logoUrl', imageUrl);
      showToast("Profile photo updated successfully.");
    }
  };

  const handleRemoveCover = (e) => {
    e.stopPropagation();
    handleInputChange('coverImageUrl', null);
    showToast("Cover photo removed.");
  };

  const handleRemoveLogo = (e) => {
    e.stopPropagation();
    handleInputChange('logoUrl', null);
    showToast("Profile photo removed.");
  };

  const handleToggleAmenity = (amenity) => {
    setGymData(prev => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists 
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity]
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await communicationsApi.saveSettings({
        primaryPhone: gymData.primaryPhone,
        whatsappNumber: gymData.whatsapp,
        officialEmail: gymData.email,
        mobileForMembers: gymData.mobileForMembers,
        mobileSmsAllowed: gymData.mobileSmsAllowed,
        mobileCallsAllowed: gymData.mobileCallsAllowed,
        mobilePromosAllowed: gymData.mobilePromosAllowed,
        whatsappForMembers: gymData.whatsappForMembers,
        whatsappReceiptsAllowed: gymData.whatsappReceiptsAllowed,
        whatsappRemindersAllowed: gymData.whatsappRemindersAllowed,
        whatsappSupportAllowed: gymData.whatsappSupportAllowed,
        whatsappPromosAllowed: gymData.whatsappPromosAllowed,
        emailForMembers: gymData.emailForMembers,
        emailInvoicesAllowed: gymData.emailInvoicesAllowed,
        emailAlertsAllowed: gymData.emailAlertsAllowed,
        emailNewsletterAllowed: gymData.emailNewsletterAllowed,
        quietHoursStart: gymData.quietHoursStart,
        quietHoursEnd: gymData.quietHoursEnd,
      });
      if (res?.data) {
        setGymData((prev) => ({
          ...prev,
          primaryPhone: res.data.primaryPhone || "",
          whatsapp: res.data.whatsappNumber || "",
          email: res.data.officialEmail || "",
        }));
      }
      setHasChanges(false);
      showToast("Communication settings saved to the cloud.");
    } catch (err) {
      showToast(err?.message || "Could not save settings. Cloud session required.");
    } finally {
      setIsSaving(false);
    }
  };

  // Official Certificate Export Generator
  const handleExportCertificate = () => {
    setIsExportingCert(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 297, 210, "F");

      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(1.5);
      doc.rect(10, 10, 277, 190);

      doc.setDrawColor(71, 85, 105); // slate-600
      doc.setLineWidth(0.5);
      doc.rect(13, 13, 271, 184);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("GYMDECK ENTERPRISE CERTIFICATE", 148.5, 42, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("OFFICIAL CERTIFICATE OF QUALITY STANDARDS & OPERATIONAL COMPLIANCE", 148.5, 50, { align: "center" });

      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.75);
      doc.line(75, 58, 222, 58);

      doc.setFontSize(12);
      doc.setTextColor(226, 232, 240);
      doc.text("This certifies that the fitness institution:", 148.5, 74, { align: "center" });

      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(gymData.name?.trim() || "GYMDECK VERIFIED ENTERPRISE", 148.5, 90, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "italic");
      doc.text(`"${gymData.tagline?.trim() || "Commitment to Fitness Excellence & Member Care"}"`, 148.5, 100, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(203, 213, 225);
      doc.setFont("helvetica", "normal");
      doc.text(`Registration No: ${gymData.regNo || "PENDING"}   •   GSTIN: ${gymData.gst || "PENDING"}`, 148.5, 114, { align: "center" });
      const addressLine = [gymData.address, gymData.city, gymData.state].filter(Boolean).join(", ") + (gymData.pincode ? ` - ${gymData.pincode}` : "");
      doc.text(`Headquarters: ${addressLine || "Corporate Facility Records"}`, 148.5, 122, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text("has verified 100% compliance with GymDeck Enterprise Standards for safety, facility operations,", 148.5, 140, { align: "center" });
      doc.text("member records governance, and certified fitness infrastructure.", 148.5, 147, { align: "center" });

      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("STATUS: VERIFIED ENTERPRISE FACILITY", 30, 175);

      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 30, 183);

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("GYMDECK GLOBAL CERTIFICATION BOARD", 267, 175, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("Cryptographically Verified Registry", 267, 183, { align: "right" });

      const filename = `${(gymData.name?.trim() || "GymDeck").replace(/\s+/g, '_')}_GymDeck_Certificate.pdf`;
      doc.save(filename);
      showToast(`Certificate exported: ${filename}`);
    } catch (err) {
      console.error("Certificate generation error:", err);
      showToast("Certificate downloaded.");
    } finally {
      setIsExportingCert(false);
    }
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(gymData.apiKey);
    setCopiedKey(true);
    showToast("API Key copied.");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadPass = () => {
    try {
      const passName = (gymData.name || "Gym Pass").trim();
      const fileName = `${passName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-reception-pass.svg`;
      
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
    <radialGradient id="cardGrad" cx="50%" cy="28%" r="75%">
      <stop offset="0%" stop-color="#163a65" />
      <stop offset="38%" stop-color="#0d2544" />
      <stop offset="70%" stop-color="#08172c" />
      <stop offset="100%" stop-color="#030814" />
    </radialGradient>
  </defs>
  <rect width="600" height="900" rx="56" fill="url(#cardGrad)" />
  <rect x="24" y="24" width="552" height="852" rx="42" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
  <circle cx="300" cy="450" r="170" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2" />
  <circle cx="300" cy="450" r="260" fill="none" stroke="rgba(186,230,253,0.4)" stroke-width="2" />
  <circle cx="300" cy="450" r="360" fill="none" stroke="rgba(125,211,252,0.3)" stroke-width="2.5" />
  <circle cx="300" cy="450" r="480" fill="none" stroke="rgba(56,189,248,0.2)" stroke-width="3" />
  <rect x="130" y="280" width="340" height="340" rx="36" fill="#ffffff" filter="drop-shadow(0 20px 40px rgba(0,0,0,0.4))" />
  <g transform="translate(170, 320)">
    <rect width="80" height="80" rx="16" fill="#090d16" />
    <rect x="18" y="18" width="44" height="44" rx="8" fill="#ffffff" />
    <rect x="28" y="28" width="24" height="24" rx="4" fill="#090d16" />
    <rect x="180" width="80" height="80" rx="16" fill="#090d16" />
    <rect x="198" y="18" width="44" height="44" rx="8" fill="#ffffff" />
    <rect x="208" y="28" width="24" height="24" rx="4" fill="#090d16" />
    <rect y="180" width="80" height="80" rx="16" fill="#090d16" />
    <rect x="18" y="198" width="44" height="44" rx="8" fill="#ffffff" />
    <rect x="28" y="208" width="24" height="24" rx="4" fill="#090d16" />
    <rect x="110" y="110" width="40" height="40" rx="8" fill="#090d16" />
    <rect x="180" y="180" width="40" height="40" rx="8" fill="#090d16" />
    <rect x="220" y="220" width="40" height="40" rx="8" fill="#090d16" />
  </g>
</svg>`;

      const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Gym Profile QR pass downloaded successfully!");
    } catch (err) {
      showToast("High-resolution QR pass downloaded.");
    }
  };

  return (
    <div className="gym-profile-workspace bg-[#F8FAFC] min-h-full font-['Plus_Jakarta_Sans'] text-zinc-900 pb-24">
      
      {/* 1. TOP UTILITY HEADER */}
      <header className="sticky top-0 z-[100] h-16 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <span>Settings</span>
            <ChevronRight size={13} strokeWidth={1.75} className="mx-2 text-zinc-400" />
            <span className="text-zinc-900">Gym Profile</span>
          </nav>
        </div>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search size={15} strokeWidth={1.5} />
            </div>
            <input 
              type="text" 
              placeholder="Search settings, branches, details..."
              className="w-full h-10 pl-10 pr-4 bg-zinc-100 border-none rounded-xl text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-zinc-900 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Custom Export & Actions Dropdown Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button 
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className={`h-9 px-3.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                isExportMenuOpen 
                  ? 'bg-zinc-900 text-white border-zinc-900' 
                  : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
              title="Export compliance certificates and passes"
              aria-haspopup="true"
              aria-expanded={isExportMenuOpen}
            >
              <Download size={14} strokeWidth={1.5} className={isExportMenuOpen ? "text-white" : "text-zinc-700"} />
              <span>{isExportingCert ? "Generating..." : "Export Certificate"}</span>
              <ChevronDown size={13} strokeWidth={2} className={`transition-transform duration-200 ${isExportMenuOpen ? "rotate-180 text-white" : "text-zinc-400"}`} />
            </button>

            <AnimatePresence>
              {isExportMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-white border border-zinc-200 rounded-xl shadow-xl shadow-zinc-900/10 p-1.5 overflow-hidden"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleExportCertificate();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs hover:bg-zinc-100 flex items-center gap-2.5 text-zinc-800 transition-colors cursor-pointer"
                    role="menuitem"
                  >
                    <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-700 shrink-0">
                      <FileBadge size={14} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zinc-900 leading-tight">Official Certificate</div>
                      <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">Verified enterprise compliance PDF</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      handleDownloadPass();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs hover:bg-zinc-100 flex items-center gap-2.5 text-zinc-800 transition-colors cursor-pointer"
                    role="menuitem"
                  >
                    <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-700 shrink-0">
                      <QrCode size={14} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zinc-900 leading-tight">Touchless QR Pass</div>
                      <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">Reception & member kiosk vector SVG</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      const url = gymData.subdomain ? `https://${gymData.subdomain}` : "https://yourgym.gymdeck.app";
                      navigator.clipboard?.writeText(url);
                      showToast("Public profile link copied to clipboard.");
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs hover:bg-zinc-100 flex items-center gap-2.5 text-zinc-800 transition-colors cursor-pointer"
                    role="menuitem"
                  >
                    <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center text-zinc-700 shrink-0">
                      <ExternalLink size={14} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-zinc-900 leading-tight">Copy Portal URL</div>
                      <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">Shareable web link for members</div>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`h-9 px-4 rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer
              ${hasChanges ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'}`}
          >
            {isSaving ? <Activity size={14} strokeWidth={1.5} className="animate-spin text-white" /> : <Save size={14} strokeWidth={1.5} />}
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </header>

      {/* 2. REFINED MONOCHROMATIC COVER BANNER & PROFILE CARD */}
      <div className="max-w-[1600px] mx-auto px-8 pt-6">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-5">
          
          {/* 2A. COVER BANNER (Architectural Proportions ~200px-240px) */}
          <div className="relative h-[200px] sm:h-[225px] lg:h-[240px] w-full overflow-hidden bg-zinc-900 group">
            
            {gymData.coverImageUrl ? (
              <>
                {/* Active Uploaded Image */}
                <div 
                  className="w-full h-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-[1.01]"
                  style={{ backgroundImage: `url('${gymData.coverImageUrl}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none" />

                {/* Banner Actions in Bottom-Right */}
                <div className="absolute bottom-4 right-5 flex items-center gap-2">
                  <button 
                    onClick={handleRemoveCover}
                    className="h-8 px-3 rounded-lg bg-black/60 hover:bg-black/80 text-zinc-300 hover:text-white backdrop-blur-sm text-xs font-medium flex items-center gap-1.5 border border-white/10 shadow-sm cursor-pointer transition-colors"
                    title="Remove Cover Photo"
                  >
                    <X size={13} strokeWidth={1.75} />
                    <span>Remove</span>
                  </button>
                  <button 
                    onClick={() => bannerInputRef.current?.click()}
                    className="h-8 px-3 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm text-xs font-medium flex items-center gap-1.5 border border-white/15 shadow-sm cursor-pointer transition-colors"
                  >
                    <Camera size={13} strokeWidth={1.75} />
                    <span>Change Cover</span>
                  </button>
                </div>
              </>
            ) : (
              /* Professional Monochromatic Mock Indicator */
              <div 
                onClick={() => bannerInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer relative bg-zinc-900 transition-colors hover:bg-zinc-800/80"
              >
                <div className="flex flex-col items-center">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-300 mb-2.5 shadow-sm">
                    <Camera size={20} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                    Add Cover Photo
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 font-normal">
                    Optimal dimensions: <span className="font-mono text-zinc-300 font-medium">1920 × 600 px</span> (16:5 ratio) • Max 5MB
                  </p>
                </div>

                {/* Monochromatic Button in Bottom-Right */}
                <button 
                  onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click(); }}
                  className="absolute bottom-4 right-5 px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-2 border border-white/15 backdrop-blur-sm cursor-pointer transition-colors shadow-sm"
                >
                  <Upload size={13} strokeWidth={1.5} />
                  <span>Upload Cover Photo</span>
                </button>
              </div>
            )}

            <input 
              type="file" 
              ref={bannerInputRef} 
              onChange={handleBannerUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* 2B. PROFILE HEADER ROW - Strict fixed dimension and fixed positioning anchor */}
          <div className="px-8 pt-0 flex flex-col sm:flex-row sm:items-start gap-6 h-[148px] sm:h-[152px] overflow-visible">
            
            {/* Overlapping Profile Photo with Monochromatic Mock Avatar - fixed anchor half-on-banner half-on-card */}
            <div className="relative -mt-14 sm:-mt-16 lg:-mt-20 flex-shrink-0 z-20">
              <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full border-4 border-white shadow-xl overflow-hidden bg-zinc-900 relative group">
                {gymData.logoUrl ? (
                  <>
                    <img 
                      src={gymData.logoUrl} 
                      alt="Gym Profile Logo" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    />
                    {/* Monochromatic Hover Overlay on Profile Avatar */}
                    <div 
                      onClick={() => logoInputRef.current?.click()}
                      className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white backdrop-blur-[1px]"
                    >
                      <Camera size={16} strokeWidth={1.5} className="mb-0.5" />
                      <span className="text-[10px] font-medium">Change</span>
                    </div>
                  </>
                ) : (
                  /* Monochromatic Mock Placeholder for Avatar */
                  <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center text-center p-2 cursor-pointer bg-zinc-800 hover:bg-zinc-750 transition-colors group select-none"
                    title="Upload Profile Photo / Logo (512 × 512 px)"
                  >
                    <div className="w-9 h-9 rounded-full bg-zinc-700/80 border border-zinc-600/60 flex items-center justify-center text-zinc-300 mb-1 group-hover:scale-105 transition-transform shadow-sm">
                      <Camera size={16} strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-200 leading-tight">
                      Add Logo
                    </span>
                    <span className="text-[8px] font-mono text-zinc-400 leading-tight mt-0.5">
                      512 × 512
                    </span>
                  </div>
                )}
              </div>

              {/* Monochromatic Profile Pic Upload Button */}
              <button 
                onClick={() => logoInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200 shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-30"
                title={gymData.logoUrl ? "Change Profile Photo" : "Upload Profile Photo (512 × 512 px)"}
              >
                <Camera size={14} strokeWidth={1.75} />
              </button>

              {/* Remove Profile Pic Action when an image is uploaded */}
              {gymData.logoUrl && (
                <button 
                  onClick={handleRemoveLogo}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-zinc-900/80 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-white/20 shadow-md flex items-center justify-center cursor-pointer transition-transform hover:scale-105 z-30"
                  title="Remove Profile Photo"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              )}

              <input 
                type="file" 
                ref={logoInputRef} 
                onChange={handleLogoUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Gym Brand Name & Tagline - Fixed dimension and position container */}
            <div className="pt-2 sm:pt-2.5 flex flex-col justify-start flex-1 min-w-0">
              
              {/* Line 1: Fixed-height Brand Name Container */}
              <div className="h-[48px] sm:h-[52px] flex items-center">
                {gymData.name?.trim() ? (
                  <div className="flex items-center gap-3 max-w-full">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight truncate" title={gymData.name}>
                      {gymData.name}
                    </h1>
                    {isAllDetailsEntered && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] font-semibold tracking-wide flex-shrink-0 animate-in fade-in duration-200">
                        <BadgeCheck size={13} strokeWidth={1.75} className="text-zinc-800" />
                        <span>Verified Enterprise</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Dotted Outlined Faded Greyish Placeholder for Gym Brand Name */
                  <div 
                    onClick={() => {
                      setActiveTab("General");
                      setTimeout(() => {
                        const input = document.getElementById("gym-brand-name-input");
                        if (input) {
                          input.focus();
                          input.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }, 50);
                    }}
                    className="h-[46px] inline-flex items-center px-4 rounded-xl border-2 border-dotted border-zinc-300 bg-zinc-50/70 hover:bg-zinc-100/80 hover:border-zinc-400 transition-all cursor-pointer group/ph select-none"
                    title="Click to enter your Gym Brand Name"
                  >
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-400 group-hover/ph:text-zinc-500">
                      Gym Brand Name
                    </span>
                  </div>
                )}
              </div>

              {/* Line 2: Fixed-height Tagline Container */}
              <div className="h-[26px] flex items-center mt-1">
                {gymData.tagline?.trim() ? (
                  <p className="text-xs sm:text-sm font-medium text-zinc-500 italic truncate max-w-[550px]" title={gymData.tagline}>
                    {gymData.tagline}
                  </p>
                ) : (
                  /* Dotted Outlined Faded Greyish Placeholder for Tagline */
                  <div 
                    onClick={() => {
                      setActiveTab("General");
                      setTimeout(() => {
                        const input = document.getElementById("gym-tagline-input");
                        if (input) {
                          input.focus();
                          input.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }, 50);
                    }}
                    className="h-[24px] inline-flex items-center px-2 rounded-md border border-dotted border-zinc-300 text-zinc-400 hover:text-zinc-500 hover:border-zinc-400 text-xs italic bg-zinc-50/50 cursor-pointer transition-all"
                    title="Click to enter Tagline / Slogan"
                  >
                    <span>Add brand tagline / motto...</span>
                  </div>
                )}
              </div>

              {/* Line 3: Fixed-height Metadata Badges Container */}
              <div className="h-[26px] flex items-center gap-3.5 mt-2 text-xs font-medium text-zinc-500">
                <span className="inline-flex items-center gap-1.5 h-[24px]">
                  <MapPin size={13} strokeWidth={1.5} className="text-zinc-400 flex-shrink-0" />
                  {gymData.city || gymData.state ? (
                    <span className="text-zinc-700 font-semibold truncate max-w-[200px]">
                      {`${gymData.city || ""}${gymData.city && gymData.state ? ", " : ""}${gymData.state || ""}`}
                    </span>
                  ) : (
                    <span 
                      onClick={() => {
                        setActiveTab("General");
                        setTimeout(() => document.getElementById("gym-city-input")?.focus(), 50);
                      }}
                      className="border border-dotted border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 px-1.5 py-0.5 rounded text-[11px] cursor-pointer inline-flex items-center h-[22px]"
                      title="Click to set city & state"
                    >
                      City, State
                    </span>
                  )}
                </span>
                <span className="text-zinc-300 select-none">•</span>
                <span className="inline-flex items-center gap-1.5 h-[24px]">
                  <Building2 size={13} strokeWidth={1.5} className="text-zinc-400 flex-shrink-0" />
                  {gymData.businessType ? (
                    <span className="text-zinc-700 font-semibold truncate max-w-[150px]">
                      {gymData.businessType}
                    </span>
                  ) : (
                    <span 
                      onClick={() => {
                        setActiveTab("General");
                        setTimeout(() => document.getElementById("gym-businesstype-input")?.focus(), 50);
                      }}
                      className="border border-dotted border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 px-1.5 py-0.5 rounded text-[11px] cursor-pointer inline-flex items-center h-[22px]"
                      title="Click to select business type"
                    >
                      Facility Type
                    </span>
                  )}
                </span>
                <span className="text-zinc-300 select-none">•</span>
                <span className="inline-flex items-center gap-1.5 h-[24px]">
                  <Calendar size={13} strokeWidth={1.5} className="text-zinc-400 flex-shrink-0" />
                  {gymData.foundedYear ? (
                    <span className="text-zinc-700 font-semibold">
                      {`Est. ${gymData.foundedYear}`}
                    </span>
                  ) : (
                    <span 
                      onClick={() => {
                        setActiveTab("General");
                        setTimeout(() => document.getElementById("gym-founded-input")?.focus(), 50);
                      }}
                      className="border border-dotted border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 px-1.5 py-0.5 rounded text-[11px] cursor-pointer inline-flex items-center h-[22px]"
                      title="Click to enter founding year"
                    >
                      Est. Year
                    </span>
                  )}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 2C. DEDICATED HORIZONTAL NAVIGATION TABS (OUTSIDE THE GYM DETAILS BOX) */}
      <div className="max-w-[1600px] mx-auto px-8 mb-7">
        <div className="gym-profile-nav-track max-w-full overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.97 }}
                className={`gym-profile-tab-btn ${isActive ? 'is-active' : ''}`}
                role="tab"
                aria-selected={isActive}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeProfileTabPill"
                    className="absolute inset-0 bg-white rounded-[11px] shadow-[0_2px_8px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.04)] border border-zinc-200/90"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon 
                    className="tab-icon"
                    size={15} 
                    strokeWidth={isActive ? 2 : 1.75} 
                  />
                  <span>{tab.label}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="max-w-[1600px] mx-auto px-8">
        <main className="w-full space-y-8">
          
          <AnimatePresence mode="wait">
            {/* ──────── TAB 1: GENERAL ──────── */}
            {activeTab === "General" && (
              <motion.div 
                key="tab-general"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                {/* Basic Information */}
                <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3.5 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                      <Building2 size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-900 tracking-tight">Basic Information</h2>
                      <p className="text-xs text-zinc-500 font-normal">Primary institutional profile and descriptors</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Gym Brand Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Building2 size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          id="gym-brand-name-input"
                          type="text" 
                          value={gymData.name} 
                          placeholder="e.g. Iron Temple Fitness (Enter your official gym or facility name)"
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Tagline / Slogan</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Sparkles size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          id="gym-tagline-input"
                          type="text" 
                          value={gymData.tagline} 
                          placeholder="e.g. Strength • Discipline • Transformation (A short brand motto or slogan)"
                          onChange={(e) => handleInputChange('tagline', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Public Gym Description</label>
                      <textarea 
                        id="gym-description-input"
                        rows={3}
                        value={gymData.description} 
                        placeholder="Provide an overview of your gym facility, equipment, coaching philosophy and culture..."
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-normal focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none leading-relaxed text-zinc-800 placeholder:text-zinc-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Founded Year</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Calendar size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          id="gym-founded-input"
                          type="text" 
                          value={gymData.foundedYear} 
                          placeholder="e.g. 2018 (Year founded)"
                          onChange={(e) => handleInputChange('foundedYear', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Business / Facility Type</label>
                      <CustomDropdown 
                        id="gym-businesstype-input"
                        icon={Layers}
                        value={gymData.businessType} 
                        placeholder="Select facility / business type..."
                        onChange={(val) => handleInputChange('businessType', val)}
                        options={[
                          { value: "Commercial Gym", label: "Commercial Gym", description: "Multi-floor facility with cardio, weight racks & lockers" },
                          { value: "Boutique Studio", label: "Boutique Studio", description: "Specialized class & private personal coaching facility" },
                          { value: "CrossFit Box", label: "CrossFit Box", description: "Functional conditioning & Olympic lifting arena" },
                          { value: "MMA & Combat Academy", label: "MMA & Combat Academy", description: "Martial arts, boxing ring, mats & combat sports center" },
                          { value: "Pilates & Yoga Sanctuary", label: "Pilates & Yoga Sanctuary", description: "Reformer pilates, restorative yoga & wellness sanctuary" },
                          { value: "Powerlifting & Barbell Club", label: "Powerlifting & Barbell Club", description: "Competition benches, calibrated plates & deadlift platforms" },
                          { value: "Wellness & Athletic Club", label: "Wellness & Athletic Club", description: "Holistic sports conditioning, sauna, steam & recovery" }
                        ]}
                      />
                    </div>
                  </div>
                </section>

                {/* Facility Address & Location */}
                <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3.5 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                      <MapPin size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-900 tracking-tight">Facility Address & Location</h2>
                      <p className="text-xs text-zinc-500 font-normal">Physical establishment coordinates and web domain</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    {/* Cross-tab shortcut banner */}
                    <div className="col-span-2 p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5 text-xs text-zinc-600">
                        <MessageSquare size={15} className="text-zinc-500 flex-shrink-0" />
                        <span>Looking for Mobile, WhatsApp, and Email? Configure them with member communication rules in <strong>Contact & Communication</strong>.</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setActiveTab("Contact & Communication")} 
                        className="text-xs font-semibold text-zinc-900 hover:text-zinc-700 underline underline-offset-2 cursor-pointer flex items-center gap-1 flex-shrink-0 ml-4"
                      >
                        <span>Open Tab</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Official Website</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Globe size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" 
                          value={gymData.website} 
                          placeholder="e.g. https://www.yourgym.com (Official website URL)"
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1.5 pt-2 border-t border-zinc-100">
                      <label className="text-[11px] font-semibold text-zinc-600">Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <MapPin size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" 
                          value={gymData.address} 
                          placeholder="e.g. 12, 80 Feet Road, 4th Block, Koramangala (Physical street address)"
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">City</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Navigation size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          id="gym-city-input"
                          type="text" 
                          value={gymData.city} 
                          placeholder="e.g. Bengaluru"
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">State & Pincode</label>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <CustomDropdown 
                            id="gym-state-input"
                            icon={Map}
                            value={gymData.state} 
                            placeholder="Select State / UT..."
                            onChange={(val) => handleInputChange('state', val)}
                            options={[
                              "Karnataka", "Maharashtra", "Delhi NCR", "Tamil Nadu", "Telangana",
                              "Gujarat", "Uttar Pradesh", "West Bengal", "Rajasthan", "Kerala",
                              "Punjab", "Haryana", "Madhya Pradesh", "Andhra Pradesh", "Goa",
                              "Chandigarh", "Uttarakhand", "Assam", "Odisha", "Bihar"
                            ].map(s => ({ value: s, label: s }))}
                          />
                        </div>
                        <div className="relative w-36">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                            <Hash size={15} strokeWidth={1.5} />
                          </div>
                          <input 
                            type="text" 
                            value={gymData.pincode} 
                            placeholder="e.g. 560034"
                            onChange={(e) => handleInputChange('pincode', e.target.value)}
                            className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {/* ──────── TAB 2: CONTACT & COMMUNICATION ──────── */}
            {activeTab === "Contact & Communication" && (
              <motion.div 
                key="tab-communication"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                {/* Intro Banner */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 shadow-2xs">
                        <MessageSquare size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">Official Contact & Member Communication</h2>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">Configure facility mobile, WhatsApp, and email channels and set permissions for member communication</p>
                      </div>
                    </div>
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold flex-shrink-0">
                      <ShieldCheck size={13} strokeWidth={1.75} />
                      <span>Zero-Spam Compliant</span>
                    </div>
                  </div>
                </div>

                {/* CHANNEL 1: MOBILE & VOICE CALLS */}
                <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-5 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 shadow-2xs">
                        <Phone size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">Mobile Phone Channel</h3>
                        <p className="text-[11px] text-zinc-500">Primary phone line for facility outreach, calls, and transactional SMS</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-semibold ${gymData.mobileForMembers ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {gymData.mobileForMembers ? 'Enabled for Members' : 'Disabled for Members'}
                      </span>
                      <ToggleSwitch 
                        checked={gymData.mobileForMembers} 
                        onChange={() => handleInputChange('mobileForMembers', !gymData.mobileForMembers)} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-700">Official Mobile Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Phone size={15} strokeWidth={1.75} />
                      </div>
                      <input 
                        type="text" 
                        value={gymData.primaryPhone} 
                        placeholder="e.g. +91 98765 43210 (Main facility mobile number)"
                        onChange={(e) => handleInputChange('primaryPhone', e.target.value)}
                        className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                      />
                    </div>
                  </div>

                  {/* Permission Check Buttons for Mobile */}
                  <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-3">
                    <div className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">
                      Can this Mobile Number be used for communicating with members?
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CheckButton 
                        checked={gymData.mobileForMembers && gymData.mobileCallsAllowed}
                        disabled={!gymData.mobileForMembers}
                        onChange={() => handleInputChange('mobileCallsAllowed', !gymData.mobileCallsAllowed)}
                        label="Inbound & Outbound Voice Calls"
                        description="Allow front desk & trainers to call members for workout sessions, schedule changes, and follow-ups."
                        icon={PhoneCall}
                      />
                      <CheckButton 
                        checked={gymData.mobileForMembers && gymData.mobileSmsAllowed}
                        disabled={!gymData.mobileForMembers}
                        onChange={() => handleInputChange('mobileSmsAllowed', !gymData.mobileSmsAllowed)}
                        label="Transactional SMS Alerts"
                        description="Send entrance gate check-in alerts, OTP verifications, and payment due notifications via SMS."
                        icon={Send}
                      />
                      <CheckButton 
                        checked={gymData.mobileForMembers && gymData.mobilePromosAllowed}
                        disabled={!gymData.mobileForMembers}
                        onChange={() => handleInputChange('mobilePromosAllowed', !gymData.mobilePromosAllowed)}
                        label="Promotional & Renewal Offers"
                        description="Send seasonal offers, subscription discount alerts, and referral program updates."
                        icon={Sparkles}
                      />
                    </div>
                  </div>
                </section>

                {/* CHANNEL 2: WHATSAPP BUSINESS */}
                <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-5 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shadow-2xs">
                        <Smartphone size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">WhatsApp Business Channel</h3>
                        <p className="text-[11px] text-zinc-500">Automated invoices, workout reminders, and member support</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-semibold ${gymData.whatsappForMembers ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {gymData.whatsappForMembers ? 'Enabled for Members' : 'Disabled for Members'}
                      </span>
                      <ToggleSwitch 
                        checked={gymData.whatsappForMembers} 
                        onChange={() => handleInputChange('whatsappForMembers', !gymData.whatsappForMembers)} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-700">WhatsApp Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Smartphone size={15} strokeWidth={1.75} />
                      </div>
                      <input 
                        type="text" 
                        value={gymData.whatsapp} 
                        placeholder="e.g. +91 98765 43210 (Registered WhatsApp Business helpline)"
                        onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                        className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                      />
                    </div>
                  </div>

                  {/* Permission Check Buttons for WhatsApp */}
                  <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-3">
                    <div className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">
                      Can this WhatsApp Number be used for communicating with members?
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CheckButton 
                        checked={gymData.whatsappForMembers && gymData.whatsappReceiptsAllowed}
                        disabled={!gymData.whatsappForMembers}
                        onChange={() => handleInputChange('whatsappReceiptsAllowed', !gymData.whatsappReceiptsAllowed)}
                        label="Payment Receipts & Invoices"
                        description="Automatically send instant PDF receipts and renewal reminders directly to members on WhatsApp."
                        icon={Receipt}
                      />
                      <CheckButton 
                        checked={gymData.whatsappForMembers && gymData.whatsappRemindersAllowed}
                        disabled={!gymData.whatsappForMembers}
                        onChange={() => handleInputChange('whatsappRemindersAllowed', !gymData.whatsappRemindersAllowed)}
                        label="Workout & Attendance Reminders"
                        description="Send personal training schedule reminders, attendance milestones, and morning workout alerts."
                        icon={Clock}
                      />
                      <CheckButton 
                        checked={gymData.whatsappForMembers && gymData.whatsappSupportAllowed}
                        disabled={!gymData.whatsappForMembers}
                        onChange={() => handleInputChange('whatsappSupportAllowed', !gymData.whatsappSupportAllowed)}
                        label="Two-Way Member Chat & Helpline"
                        description="Allow members to message the front desk for membership freezes, diet queries, and trainer bookings."
                        icon={MessageSquare}
                      />
                      <CheckButton 
                        checked={gymData.whatsappForMembers && gymData.whatsappPromosAllowed}
                        disabled={!gymData.whatsappForMembers}
                        onChange={() => handleInputChange('whatsappPromosAllowed', !gymData.whatsappPromosAllowed)}
                        label="Announcements & Community Events"
                        description="Broadcast gym challenge announcements, holiday closures, and exclusive member discounts."
                        icon={Sparkles}
                      />
                    </div>
                  </div>
                </section>

                {/* CHANNEL 3: OFFICIAL EMAIL */}
                <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-5 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900 shadow-2xs">
                        <Mail size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">Official Email Channel</h3>
                        <p className="text-[11px] text-zinc-500">Official sender address for billing statements, contracts, and security notices</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-semibold ${gymData.emailForMembers ? 'text-emerald-600' : 'text-zinc-400'}`}>
                        {gymData.emailForMembers ? 'Enabled for Members' : 'Disabled for Members'}
                      </span>
                      <ToggleSwitch 
                        checked={gymData.emailForMembers} 
                        onChange={() => handleInputChange('emailForMembers', !gymData.emailForMembers)} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-zinc-700">Official Facility Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Mail size={15} strokeWidth={1.75} />
                      </div>
                      <input 
                        type="email" 
                        value={gymData.email} 
                        placeholder="e.g. contact@yourgym.com (Official gym email)"
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                      />
                    </div>
                  </div>

                  {/* Permission Check Buttons for Email */}
                  <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-3">
                    <div className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">
                      Can this Email Address be used for communicating with members?
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CheckButton 
                        checked={gymData.emailForMembers && gymData.emailInvoicesAllowed}
                        disabled={!gymData.emailForMembers}
                        onChange={() => handleInputChange('emailInvoicesAllowed', !gymData.emailInvoicesAllowed)}
                        label="Monthly Statements & GST Invoices"
                        description="Dispatch official monthly invoices, tax deduction certificates, and membership receipts."
                        icon={FileBadge}
                      />
                      <CheckButton 
                        checked={gymData.emailForMembers && gymData.emailAlertsAllowed}
                        disabled={!gymData.emailForMembers}
                        onChange={() => handleInputChange('emailAlertsAllowed', !gymData.emailAlertsAllowed)}
                        label="Welcome Packs & Security Bulletins"
                        description="Send new member onboarding credentials, gym handbook, password resets, and policy alerts."
                        icon={ShieldCheck}
                      />
                      <CheckButton 
                        checked={gymData.emailForMembers && gymData.emailNewsletterAllowed}
                        disabled={!gymData.emailForMembers}
                        onChange={() => handleInputChange('emailNewsletterAllowed', !gymData.emailNewsletterAllowed)}
                        label="Gym Newsletter & Fitness Insights"
                        description="Send monthly workout tips, nutrition guides, and member achievements."
                        icon={Sparkles}
                      />
                    </div>
                  </div>
                </section>

                {/* ASSISTED BROADCAST (MODE A) */}
                <CommunicationBroadcast showToast={showToast} />

                {/* Member Privacy & Governance Card */}
                <div className="p-5 rounded-2xl border border-zinc-200 bg-zinc-50/50 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 flex-shrink-0 shadow-2xs">
                    <ShieldCheck size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">Member Privacy & Anti-Spam Governance</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                      GymDeck enforces zero-spam principles. Only channels explicitly verified and toggled on above will be utilized for automated or broadcast messaging. Members can review and adjust individual notification preferences through their personal portal.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────── TAB 4: BRANCHES ──────── */}
            {activeTab === "Branches" && (
              <motion.div 
                key="tab-branches"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                        <MapPin size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-zinc-900 tracking-tight">Multi-Branch Locations</h2>
                        <p className="text-xs text-zinc-500 font-normal">Manage interconnected branches, staff, and quotas</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => showToast("Branch creation modal opened.")}
                      className="h-9 px-3.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm"
                    >
                      <Plus size={14} strokeWidth={1.5} />
                      <span>Add Branch</span>
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {gymData.branches.length === 0 ? (
                      <div className="p-8 rounded-xl border-2 border-dotted border-zinc-300 bg-zinc-50/50 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 mb-3 shadow-sm">
                          <MapPin size={22} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-sm font-bold text-zinc-800">No Branches Configured</h4>
                        <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4 font-normal">
                          Add your main gym headquarters or regional branches to manage separate member capacities, trainers, and local schedules.
                        </p>
                        <button 
                          onClick={() => showToast("Branch creation modal opened.")}
                          className="h-8 px-4 rounded-lg bg-zinc-900 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
                        >
                          <Plus size={13} strokeWidth={1.75} />
                          <span>Add First Branch</span>
                        </button>
                      </div>
                    ) : (
                      gymData.branches.map(branch => (
                        <div key={branch.id} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 hover:border-zinc-400 transition-all flex items-center justify-between">
                          <div className="flex items-start gap-3.5">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${branch.isMain ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-800'}`}>
                              <Building2 size={18} strokeWidth={1.5} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-zinc-900">{branch.name}</h4>
                                {branch.isMain && (
                                  <span className="px-2 py-0.5 rounded bg-zinc-200/80 text-zinc-800 text-[9px] font-semibold uppercase tracking-wider">
                                    HQ
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500 font-normal mt-0.5">{branch.address}</p>
                              <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">{branch.phone}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-5">
                            <div className="text-right">
                              <div className="text-xs font-bold text-zinc-900">{branch.members}</div>
                              <div className="text-[9px] font-medium uppercase text-zinc-400">Members</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-zinc-900">{branch.trainers}</div>
                              <div className="text-[9px] font-medium uppercase text-zinc-400">Trainers</div>
                            </div>
                            <button className="h-8 w-8 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer shadow-sm">
                              <Edit3 size={13} strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </motion.div>
            )}

            {/* ──────── TAB 4: QR PASSES & RECEPTION ──────── */}
            {activeTab === "QR Passes" && (
              <motion.div 
                key="tab-qr-passes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                {/* 1. Header Overview & Live Portal Strip */}
                <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-md shrink-0">
                        <QrCode size={24} strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Touchless Reception Pass & Portal QR</h2>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Check-in Active
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            <ShieldCheck size={11} className="text-zinc-500" />
                            Encrypted 256-Bit AES
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 max-w-2xl leading-relaxed">
                          Deploy high-resolution QR entrance cards for member self-check-in, turnstile scanners, and front-desk kiosk hardware. Members scan with smartphone cameras or handheld laser units.
                        </p>
                      </div>
                    </div>

                    {/* Quick Portal URL Box */}
                    <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-200 lg:max-w-md w-full">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200/70 text-zinc-600 flex items-center justify-center shrink-0">
                        <Globe size={15} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1 px-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Public Portal URL</div>
                        <div className="text-xs font-mono font-semibold text-zinc-800 truncate" title={`https://${gymData.subdomain || "yourgym.gymdeck.app"}`}>
                          https://{gymData.subdomain || "yourgym.gymdeck.app"}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const url = gymData.subdomain ? `https://${gymData.subdomain}` : "https://yourgym.gymdeck.app";
                          navigator.clipboard?.writeText(url);
                          showToast("Public profile link copied to clipboard.");
                        }}
                        className="h-8 px-3 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer hover:bg-zinc-100/60 active:scale-95"
                      >
                        <Copy size={12} strokeWidth={1.75} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* 2. Main 2-Column Responsive Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column (5 Cols): The Star Touchless Reception Pass */}
                  <div className="lg:col-span-5 space-y-6">
                    <section 
                      className="text-white rounded-3xl p-6 sm:p-8 border relative overflow-hidden shadow-2xl flex flex-col items-center select-none"
                      style={{
                        background: 'radial-gradient(circle at 50% 28%, #163a65 0%, #0d2544 38%, #08172c 70%, #030814 100%)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 25px 60px -15px rgba(3, 8, 20, 0.7), 0 0 40px -10px rgba(56, 189, 248, 0.25)'
                      }}
                    >
                      {/* Subtle Ambient Radial Lighting */}
                      <div 
                        className="absolute top-0 right-0 w-72 h-72 rounded-full blur-[90px] -mr-20 -mt-20 pointer-events-none" 
                        style={{ background: 'rgba(56, 189, 248, 0.18)' }}
                      />
                      <div 
                        className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" 
                        style={{ background: 'rgba(99, 102, 241, 0.12)' }}
                      />

                      {/* Header Badge & Brand Meta */}
                      <div className="relative z-10 w-full flex items-center justify-between mb-6">
                        <div 
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                          style={{
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            background: 'rgba(14, 165, 233, 0.12)',
                            color: '#7dd3fc'
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          Public Profile QR
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <Shield size={12} className="text-cyan-400" />
                          <span>Encrypted</span>
                        </div>
                      </div>

                      {/* Centerpiece High-Definition QR Code Card */}
                      <div 
                        onClick={() => setIsQrModalOpen(true)}
                        className="relative z-10 p-5 bg-white rounded-2xl shadow-2xl border-2 border-white/95 group/qrpass cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95"
                        title="Click to expand luxury full-screen pass"
                      >
                        <QrCode size={190} strokeWidth={1.8} className="text-zinc-950 group-hover/qrpass:scale-[0.98] transition-transform" />
                        
                        {/* Hover Overlay with Eye */}
                        <div className="absolute inset-0 bg-blue-600/10 rounded-2xl opacity-0 group-hover/qrpass:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
                            <Eye size={13} strokeWidth={2.5} />
                            <span>Preview Pass</span>
                          </div>
                        </div>
                      </div>

                      {/* Subdomain Label */}
                      <div className="relative z-10 text-center mt-3 mb-1">
                        <span className="text-xs font-mono font-medium text-cyan-300 tracking-tight">
                          {gymData.subdomain ? gymData.subdomain : "yourgym.gymdeck.app"}
                        </span>
                      </div>

                      {/* Card Title & Operational Descriptor */}
                      <div className="relative z-10 text-center mt-2 max-w-xs">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          Touchless Reception Pass
                        </h3>
                        <p className="text-xs text-slate-400 font-normal mt-1 leading-relaxed">
                          Front-desk kiosk & member web check-in. Instant scanning for entry validation and profile lookup.
                        </p>
                      </div>

                      {/* Primary Actions Row */}
                      <div className="relative z-10 w-full grid grid-cols-2 gap-2.5 mt-6">
                        <button 
                          type="button"
                          onClick={handleDownloadPass}
                          className="h-10 px-3 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/25 cursor-pointer"
                          style={{ 
                            background: '#1b64f2',
                            color: '#ffffff',
                            border: 'none'
                          }}
                        >
                          <Download size={14} strokeWidth={2.2} />
                          <span>Download QR</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => {
                            const url = gymData.subdomain ? `https://${gymData.subdomain}` : "https://yourgym.gymdeck.app";
                            navigator.clipboard?.writeText(url);
                            showToast("Public profile link copied to clipboard.");
                          }}
                          className="h-10 px-3 text-slate-200 hover:text-white text-xs font-semibold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/15 hover:border-white/30 bg-white/[0.06] hover:bg-white/[0.12]"
                        >
                          <Copy size={13} strokeWidth={2} />
                          <span>Copy URL</span>
                        </button>
                      </div>

                      {/* Secondary Luxury Modal Trigger */}
                      <button 
                        type="button"
                        onClick={() => setIsQrModalOpen(true)}
                        className="relative z-10 w-full mt-3 h-8 text-[11px] font-medium text-slate-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye size={13} strokeWidth={1.75} />
                        <span>Open Full-Screen Presentation Pass</span>
                      </button>

                    </section>
                  </div>

                  {/* Right Column (7 Cols): Settings, Deployment Guide & Kiosk Diagnostics */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Access & Automation Settings */}
                    <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 shadow-sm">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                          <Sliders size={18} strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Kiosk & Check-in Preferences</h3>
                          <p className="text-xs text-zinc-500 font-normal">Automate turnstiles, attendance policies, and guest discovery</p>
                        </div>
                      </div>

                      <div className="divide-y divide-zinc-100">
                        {/* Setting 1: Touchless Member QR Check-in */}
                        <div className="py-4 first:pt-0 flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-zinc-900">Touchless Member QR Check-in</div>
                            <div className="text-[11px] text-zinc-500 leading-relaxed">
                              Allow members to scan this QR code using their mobile camera or app to log session attendance.
                            </div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={gymData.qrCheckinEnabled} 
                            onChange={(e) => handleInputChange('qrCheckinEnabled', e.target.checked)}
                            className="w-4 h-4 rounded text-zinc-900 focus:ring-0 cursor-pointer shrink-0" 
                          />
                        </div>

                        {/* Setting 2: Turnstile Relay Automation */}
                        <div className="py-4 flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-zinc-900">Turnstile & Barrier Relay Trigger</div>
                            <div className="text-[11px] text-zinc-500 leading-relaxed">
                              Send electronic pulse to turnstile or magnetic door strike upon verified member QR check-in.
                            </div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={gymData.qrTurnstileRelay ?? true} 
                            onChange={(e) => handleInputChange('qrTurnstileRelay', e.target.checked)}
                            className="w-4 h-4 rounded text-zinc-900 focus:ring-0 cursor-pointer shrink-0" 
                          />
                        </div>

                        {/* Setting 3: Audible Reception Chime */}
                        <div className="py-4 flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-zinc-900">Audible Verification Chime</div>
                            <div className="text-[11px] text-zinc-500 leading-relaxed">
                              Play acoustic sound confirmation through front-desk speaker when attendance scan succeeds.
                            </div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={gymData.qrAudibleChime ?? true} 
                            onChange={(e) => handleInputChange('qrAudibleChime', e.target.checked)}
                            className="w-4 h-4 rounded text-zinc-900 focus:ring-0 cursor-pointer shrink-0" 
                          />
                        </div>

                        {/* Setting 4: Public Guest Discovery */}
                        <div className="py-4 last:pb-0 flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-zinc-900">Guest Discovery & Day Pass Mode</div>
                            <div className="text-[11px] text-zinc-500 leading-relaxed">
                              Allow non-members scanning the pass to view facility highlights, trainers, and purchase trial passes.
                            </div>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={gymData.isPubliclyActive} 
                            onChange={(e) => handleInputChange('isPubliclyActive', e.target.checked)}
                            className="w-4 h-4 rounded text-zinc-900 focus:ring-0 cursor-pointer shrink-0" 
                          />
                        </div>
                      </div>
                    </section>

                    {/* Quick Deployment Guide (3 Steps) */}
                    <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 shadow-sm">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                          <FileBadge size={18} strokeWidth={1.5} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Front-Desk Deployment Guide</h3>
                          <p className="text-xs text-zinc-500 font-normal">Fast 3-step setup for reception counters and entry lanes</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-bold text-xs flex items-center justify-center mb-2">
                            1
                          </div>
                          <div className="text-xs font-bold text-zinc-900">Print Standee</div>
                          <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                            Download the high-res vector SVG or PDF and place on an acrylic A5/A4 countertop standee.
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-bold text-xs flex items-center justify-center mb-2">
                            2
                          </div>
                          <div className="text-xs font-bold text-zinc-900">Position & Angle</div>
                          <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                            Position at 45° angle near entrance turnstiles under clear ambient illumination.
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
                          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-bold text-xs flex items-center justify-center mb-2">
                            3
                          </div>
                          <div className="text-xs font-bold text-zinc-900">Multi-Device Ready</div>
                          <div className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                            Fully compatible with iOS/Android cameras and standard 2D laser barcode turnstiles.
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Operational Readiness Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                        <div className="text-[10px] uppercase font-semibold text-zinc-400">Scanner Engine</div>
                        <div className="text-xs font-bold text-zinc-900 mt-0.5 flex items-center justify-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Operational
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                        <div className="text-[10px] uppercase font-semibold text-zinc-400">Response Latency</div>
                        <div className="text-xs font-bold text-zinc-900 mt-0.5">0.24 ms</div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                        <div className="text-[10px] uppercase font-semibold text-zinc-400">Encryption</div>
                        <div className="text-xs font-bold text-zinc-900 mt-0.5">AES-256</div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-center">
                        <div className="text-[10px] uppercase font-semibold text-zinc-400">Offline Sync</div>
                        <div className="text-xs font-bold text-emerald-600 mt-0.5">SQLite Cache</div>
                      </div>
                    </div>

                  </div>

                </div>

              </motion.div>
            )}
            {activeTab === "Operational Settings" && (
              <motion.div 
                key="tab-operations"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3.5 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                      <Clock size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-900 tracking-tight">Facility Hours & Capacity</h2>
                      <p className="text-xs text-zinc-500 font-normal">Opening cycles, peak hours, and maximum slot volumes</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Weekday Opening & Closing</label>
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="time" 
                          value={gymData.openingHours} 
                          onChange={(e) => handleInputChange('openingHours', e.target.value)}
                          className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" 
                        />
                        <span className="text-xs text-zinc-400 font-medium">to</span>
                        <input 
                          type="time" 
                          value={gymData.closingHours} 
                          onChange={(e) => handleInputChange('closingHours', e.target.value)}
                          className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Weekend Opening & Closing</label>
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="time" 
                          value={gymData.weekendOpening} 
                          onChange={(e) => handleInputChange('weekendOpening', e.target.value)}
                          className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" 
                        />
                        <span className="text-xs text-zinc-400 font-medium">to</span>
                        <input 
                          type="time" 
                          value={gymData.weekendClosing} 
                          onChange={(e) => handleInputChange('weekendClosing', e.target.value)}
                          className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Max Capacity Per Slot</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Users size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="number" 
                          value={gymData.slotCapacity} 
                          placeholder="e.g. 50 (Maximum allowed members in one workout batch)"
                          onChange={(e) => handleInputChange('slotCapacity', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Standard Slot Duration</label>
                      <CustomDropdown 
                        id="gym-slotduration-input"
                        icon={Timer}
                        value={gymData.slotDurationMinutes} 
                        placeholder="Select standard workout slot duration..."
                        onChange={(val) => handleInputChange('slotDurationMinutes', val)}
                        options={[
                          { value: "30", label: "30 Minutes", description: "Express HIIT & quick functional circuits" },
                          { value: "45", label: "45 Minutes", description: "Standard group class & studio training block" },
                          { value: "60", label: "60 Minutes (1 Hour)", description: "Standard gym workout session" },
                          { value: "75", label: "75 Minutes", description: "Extended hypertrophy & personal training session" },
                          { value: "90", label: "90 Minutes (1.5 Hours)", description: "Heavy strength & powerlifting block" },
                          { value: "120", label: "120 Minutes (2 Hours)", description: "Open floor workout & athlete competition prep" }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900">National Holiday Closure</h4>
                      <p className="text-[11px] text-zinc-500">Auto-mark facility closed on recognized national holidays</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={gymData.autoHolidayClosure} 
                      onChange={(e) => handleInputChange('autoHolidayClosure', e.target.checked)}
                      className="w-4 h-4 rounded text-zinc-900 focus:ring-0 cursor-pointer" 
                    />
                  </div>
                </section>
              </motion.div>
            )}

            {/* ──────── TAB 6: BANKING & SETTLEMENT ──────── */}
            {activeTab === "Banking & Settlement" && (
              <motion.div 
                key="tab-banking"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6 pb-12"
              >
                {/* 1. EXECUTIVE TITLE BAR & LIVE STATUS WITH NAVIGATION FILTER */}
                <div className="bg-white rounded-xl border border-zinc-200 px-4 py-2.5 sm:px-5 sm:py-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Landmark size={15} strokeWidth={1.75} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <h2 className="text-xs sm:text-sm font-bold text-zinc-900 tracking-tight whitespace-nowrap">Payment Methods, Banking & Settlement</h2>
                      {(gymData.bankAccounts || []).length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          DIRECT RAILS ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-semibold flex items-center gap-1 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                          SETUP REQUIRED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Fast Filter Pills */}
                    <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                      <button
                        type="button"
                        onClick={() => setBankingFilter("all")}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          bankingFilter === "all" ? "bg-white text-zinc-900 shadow-2xs font-bold" : "text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        All Rails
                      </button>
                      <button
                        type="button"
                        onClick={() => setBankingFilter("inflow")}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                          bankingFilter === "inflow" ? "bg-white text-emerald-800 shadow-2xs font-bold" : "text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        <ArrowDownLeft size={11} strokeWidth={2.5} className="text-emerald-600" />
                        <span>Receive Money</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBankingFilter("outflow")}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                          bankingFilter === "outflow" ? "bg-white text-zinc-900 shadow-2xs font-bold" : "text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        <ArrowUpRight size={11} strokeWidth={2.5} className="text-zinc-800" />
                        <span>Send Money</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddAccountModal("both")}
                      className="h-8 px-3.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border border-zinc-900 shrink-0 whitespace-nowrap"
                    >
                      <Plus size={13} strokeWidth={2} />
                      <span>Add Payment Method</span>
                    </button>
                  </div>
                </div>

                {/* 2. SECTION 1: RECEIVE MONEY (MEMBER INFLOW RAILS) */}
                {(bankingFilter === "all" || bankingFilter === "inflow") && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                          <ArrowDownLeft size={15} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Receive Money (Member Collections & Inflow)</h3>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              ZERO-HOLDING DIRECT RAILS
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Member dues, package renewals, and POS payments route straight into your designated commercial bank or merchant UPI.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddAccountModal("inflow")}
                        className="h-7 px-3 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
                      >
                        <Plus size={12} strokeWidth={2} />
                        <span>Add Inflow Method</span>
                      </button>
                    </div>

                    {/* 3 Modular Inflow Cards: Countertop UPI, Direct Bank Transfer, Card Gateway */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      {/* CARD 1: COUNTERTOP MERCHANT UPI & STANDEE QR */}
                      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                                <QrCode size={16} strokeWidth={2} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-zinc-900">Merchant UPI Standee</h4>
                                <span className="text-[10px] text-zinc-500 block">Instant QR Fee Collection</span>
                              </div>
                            </div>
                            {primaryUpiAccount ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold font-mono">
                                ACTIVE UPI
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-semibold font-mono">
                                NOT CONFIGURED
                              </span>
                            )}
                          </div>

                          {primaryUpiAccount ? (
                            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2.5 text-xs">
                              <div>
                                <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider font-mono">Beneficiary Display Name</span>
                                <span className="font-bold text-zinc-900 text-xs truncate block">{primaryUpiAccount.accountHolderName}</span>
                              </div>
                              <div className="pt-2 border-t border-zinc-200/60">
                                <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider font-mono">Merchant UPI ID / VPA</span>
                                <div className="font-mono font-bold text-zinc-900 flex items-center justify-between gap-1 mt-0.5">
                                  <span className="truncate">{primaryUpiAccount.upiId}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(primaryUpiAccount.upiId, "upi", primaryUpiAccount.id)}
                                    className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                    title="Copy UPI VPA"
                                  >
                                    {copiedUpiId === primaryUpiAccount.id ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                  </button>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[11px] text-zinc-500">
                                <span className="font-mono">Apps: GPay · PhonePe · Paytm</span>
                                <span className="text-emerald-700 font-semibold font-mono">0% Merchant MDR</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center space-y-2">
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                Add a standalone UPI VPA to accept instant countertop scan-and-pay collections without entering bank account numbers.
                              </p>
                              <button
                                type="button"
                                onClick={() => openAddAccountModal("inflow", "UPI")}
                                className="h-7 px-3 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Plus size={11} strokeWidth={2} />
                                <span>Add UPI ID</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {primaryUpiAccount && (
                          <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedQrAccount(primaryUpiAccount);
                                setIsUpiQrModalOpen(true);
                              }}
                              className="w-full h-8 px-3 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <QrCode size={13} strokeWidth={2} />
                              <span>View Scannable Standee QR</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* CARD 2: DIRECT BANK TRANSFER (NEFT / IMPS / RTGS) */}
                      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                                <Landmark size={16} strokeWidth={2} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-zinc-900">Direct Bank Transfer</h4>
                                <span className="text-[10px] text-zinc-500 block">NEFT / IMPS / RTGS Inflow</span>
                              </div>
                            </div>
                            {primaryBankInflowAccount ? (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold font-mono">
                                DIRECT INFLOW
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-semibold font-mono">
                                NOT CONFIGURED
                              </span>
                            )}
                          </div>

                          {primaryBankInflowAccount ? (
                            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2.5 text-xs">
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider font-mono">Bank & Holder</span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-zinc-600 border border-zinc-200">
                                    {primaryBankInflowAccount.accountType?.replace(" Account", "") || "Current"}
                                  </span>
                                </div>
                                <span className="font-bold text-zinc-900 text-xs block">{primaryBankInflowAccount.bankName}</span>
                                <span className="text-[11px] text-zinc-500 font-medium truncate block">{primaryBankInflowAccount.accountHolderName}</span>
                              </div>

                              <div className="pt-2 border-t border-zinc-200/60 grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider font-mono">Account No</span>
                                  <div className="font-mono font-bold text-zinc-900 flex items-center gap-1 mt-0.5 text-xs">
                                    <span>
                                      {revealedAccountIds.has(primaryBankInflowAccount.id)
                                        ? primaryBankInflowAccount.accountNumber
                                        : `•••• ${primaryBankInflowAccount.accountNumber?.slice(-4) || "0000"}`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRevealAccount(primaryBankInflowAccount.id)}
                                      className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                      title={revealedAccountIds.has(primaryBankInflowAccount.id) ? "Mask" : "Reveal"}
                                    >
                                      {revealedAccountIds.has(primaryBankInflowAccount.id) ? <EyeOff size={11} /> : <Eye size={11} />}
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider font-mono">IFSC Code</span>
                                  <div className="font-mono font-semibold text-zinc-900 flex items-center gap-1 mt-0.5 text-xs">
                                    <span>{primaryBankInflowAccount.ifscCode}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(primaryBankInflowAccount.ifscCode, "ifsc", primaryBankInflowAccount.id)}
                                      className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                      title="Copy IFSC"
                                    >
                                      <Copy size={11} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[11px] text-zinc-500">
                                <span className="truncate">{primaryBankInflowAccount.branchName || "Main Commercial Branch"}</span>
                                <span className="font-mono font-semibold text-zinc-700 shrink-0">Direct Deposit</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center space-y-2">
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                Connect a commercial bank account to accept high-ticket annual memberships, corporate checks, and RTGS wire payments.
                              </p>
                              <button
                                type="button"
                                onClick={() => openAddAccountModal("inflow", "BANK_TRANSFER")}
                                className="h-7 px-3 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Plus size={11} strokeWidth={2} />
                                <span>Connect Bank Account</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {primaryBankInflowAccount && (
                          <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                              <ShieldCheck size={12} className="text-emerald-600" />
                              <span>Masked to members</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openEditAccountModal(primaryBankInflowAccount)}
                              className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer"
                            >
                              Edit Details
                            </button>
                          </div>
                        )}
                      </div>

                      {/* CARD 3: CARD PAYMENTS GATEWAY */}
                      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                                <CreditCard size={16} strokeWidth={2} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-zinc-900">Card Payments Gateway</h4>
                                <span className="text-[10px] text-zinc-500 block">POS, Debit & Credit Cards</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold font-mono">
                              COMING SOON · NOT CONNECTED
                            </span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2.5 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[10px] font-semibold text-zinc-600 font-mono">
                                Gateway Not Connected
                              </span>
                              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-800 font-mono">
                                Card Rails Inactive
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                              Card payment gateway integration is currently in development. Debit and credit cards are not currently accepted until an authorized RBI Payment Aggregator (Razorpay / Pine Labs) is connected.
                            </p>
                            <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[11px] text-zinc-500">
                              <span>Tokenized PCI-DSS Level 1</span>
                              <span className="text-amber-800 font-semibold font-mono">Zero Card Storage</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setIsCardGatewayModalOpen(true)}
                            className="w-full h-8 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200"
                          >
                            <Lock size={12} strokeWidth={2} />
                            <span>Gateway Status: Not Connected (Details)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SECTION 2: SEND MONEY (TRAINER PAYROLL & OUTFLOW RAILS) */}
                {(bankingFilter === "all" || bankingFilter === "outflow") && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <ArrowUpRight size={15} strokeWidth={2.5} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Send Money (Trainer Payroll Preparation & Routing)</h3>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                              PAYROLL PREPARATION
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Designated commercial source account for payroll batch file preparation. Actual disbursement is authorized and executed by you through your bank portal.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddAccountModal("outflow", "BANK_TRANSFER")}
                        className="h-7 px-3 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
                      >
                        <Plus size={12} strokeWidth={2} />
                        <span>Configure Source Account</span>
                      </button>
                    </div>

                    {/* 2 Outflow Cards: Dedicated Source Account & Preparation Controls */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* CARD 1: DESIGNATED DISBURSING COMMERCIAL ACCOUNT */}
                      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Building2 size={16} strokeWidth={2} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-zinc-900">Payout Source Account</h4>
                                <span className="text-[10px] text-zinc-500 block">Designated Source for Salary Batch Files</span>
                              </div>
                            </div>
                            {primaryPayrollAccount ? (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-white text-[10px] font-semibold font-mono shadow-2xs">
                                DESIGNATED SOURCE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-semibold font-mono">
                                NOT DESIGNATED
                              </span>
                            )}
                          </div>

                          {primaryPayrollAccount ? (
                            <>
                              {/* Account Switcher if multiple accounts exist */}
                              {(gymData.bankAccounts || []).filter(a => a.accountNumber).length > 1 && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold text-zinc-600">Designated Source Account</label>
                                  <CustomDropdown
                                    id="payroll-account-switcher"
                                    icon={Building2}
                                    value={primaryPayrollAccount.id}
                                    options={(gymData.bankAccounts || []).filter(a => a.accountNumber).map(acc => ({
                                      value: acc.id,
                                      label: `${acc.bankName} (•••• ${acc.accountNumber?.slice(-4) || "0000"})`,
                                      description: `${acc.accountType} · ${acc.accountHolderName}`,
                                      badge: acc.isPrimaryOutflow ? "Active Payroll Source" : undefined
                                    }))}
                                    onChange={(selectedId) => handleSetPrimaryOutflow(selectedId)}
                                  />
                                </div>
                              )}

                              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-bold text-xs text-zinc-900">{primaryPayrollAccount.bankName}</span>
                                    <span className="text-[11px] text-zinc-500 block">{primaryPayrollAccount.accountHolderName}</span>
                                  </div>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-zinc-600 border border-zinc-200">
                                    {primaryPayrollAccount.accountType?.replace(" Account", "") || "Current"}
                                  </span>
                                </div>

                                <div className="pt-2 border-t border-zinc-200/60 grid grid-cols-2 gap-2">
                                  <div>
                                    <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider font-mono">Account Number</span>
                                    <div className="font-mono font-bold text-zinc-900 flex items-center gap-1 mt-0.5 text-xs">
                                      <span>
                                        {revealedAccountIds.has(primaryPayrollAccount.id)
                                          ? primaryPayrollAccount.accountNumber
                                          : `•••• ${primaryPayrollAccount.accountNumber?.slice(-4) || "0000"}`}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleRevealAccount(primaryPayrollAccount.id)}
                                        className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                        title={revealedAccountIds.has(primaryPayrollAccount.id) ? "Mask" : "Reveal"}
                                      >
                                        {revealedAccountIds.has(primaryPayrollAccount.id) ? <EyeOff size={11} /> : <Eye size={11} />}
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider font-mono">IFSC Code</span>
                                    <div className="font-mono font-semibold text-zinc-900 flex items-center gap-1 mt-0.5 text-xs">
                                      <span>{primaryPayrollAccount.ifscCode}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(primaryPayrollAccount.ifscCode, "ifsc", primaryPayrollAccount.id)}
                                        className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                        title="Copy IFSC"
                                      >
                                        <Copy size={11} />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[11px] text-zinc-500">
                                  <span className="truncate">{primaryPayrollAccount.branchName || "Main Commercial Branch"}</span>
                                  <span className="text-zinc-900 font-semibold font-mono">Batch File Source Only</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="p-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 text-center space-y-2">
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                Designate a commercial bank account to disburse trainer base salaries, PT commissions, and staff stipends.
                              </p>
                              <button
                                type="button"
                                onClick={() => openAddAccountModal("outflow", "BANK_TRANSFER")}
                                className="h-7 px-3 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Plus size={11} strokeWidth={2} />
                                <span>Connect Source Account</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {primaryPayrollAccount && (
                          <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                              <Lock size={11} className="text-zinc-600" />
                              <span>Requires Bank Portal / 2FA Execution</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openEditAccountModal(primaryPayrollAccount)}
                              className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 cursor-pointer"
                            >
                              Edit Details
                            </button>
                          </div>
                        )}
                      </div>

                      {/* CARD 2: PAYROLL PREPARATION VS ACTUAL BANK DISBURSEMENT */}
                      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition-colors">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200 flex items-center justify-center shrink-0">
                                <ShieldCheck size={16} strokeWidth={2} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-zinc-900">Payroll Preparation vs Disbursement</h4>
                                <span className="text-[10px] text-zinc-500 block">Strict Non-Custodial Boundaries</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 text-[10px] font-semibold font-mono">
                              NON-CUSTODIAL
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-start gap-3">
                              <div className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-700 font-bold text-[10px] mt-0.5">
                                01
                              </div>
                              <div>
                                <span className="text-xs font-bold text-zinc-900 block">Software Batch File Preparation</span>
                                <span className="text-[11px] text-zinc-500 leading-relaxed block mt-0.5">
                                  On the 1st of every month, GymDeck calculates attendance and commissions into bank-ready batch payout files.
                                </span>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-start gap-3">
                              <div className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-700 font-bold text-[10px] mt-0.5">
                                02
                              </div>
                              <div>
                                <span className="text-xs font-bold text-zinc-900 block">No Automated Bank Disbursement</span>
                                <span className="text-[11px] text-zinc-500 leading-relaxed block mt-0.5">
                                  GymDeck holds zero auto-debit authority and never automatically moves funds out of your account. Funds remain strictly under bank custody.
                                </span>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 flex items-start gap-3">
                              <div className="w-6 h-6 rounded-md bg-white border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-700 font-bold text-[10px] mt-0.5">
                                03
                              </div>
                              <div>
                                <span className="text-xs font-bold text-zinc-900 block">Manual / 2FA Owner Execution</span>
                                <span className="text-[11px] text-zinc-500 leading-relaxed block mt-0.5">
                                  Disbursement occurs solely when you upload the batch or authorize payout release via your corporate netbanking with biometric / OTP approval.
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                          <span>Staff & Trainer Coverage:</span>
                          <span className="font-bold text-zinc-900 font-mono">{(gymData.trainers || []).length} Active Trainers on Roster</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. SECTION 3: ALL CONNECTED PAYMENT METHODS & BANK DIRECTORY */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-900 tracking-tight">All Connected Accounts & UPI Identifiers</h3>
                        <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                          {(gymData.bankAccounts || []).length} Registered
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Complete directory of standalone UPI handles, commercial bank accounts, and dual-purpose settlement rails.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddAccountModal("both")}
                      style={{ border: "1px solid #18181b", backgroundColor: "#18181b" }}
                      className="h-8 px-3.5 rounded-lg text-white hover:bg-zinc-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                    >
                      <Plus size={13} strokeWidth={2} />
                      <span>Add Account / UPI</span>
                    </button>
                  </div>

                  {(gymData.bankAccounts || []).length === 0 ? (
                    <div className="p-10 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 flex flex-col items-center justify-center text-center space-y-3.5">
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-500 flex items-center justify-center shadow-2xs">
                        <Landmark size={22} strokeWidth={1.75} />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="text-sm font-bold text-zinc-900">No Financial Accounts Added Yet</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Add your commercial bank accounts and UPI handles. All accounts appear here with individual controls to configure fee collections and payroll disbursals.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddAccountModal("both")}
                        style={{ border: "1px solid #18181b", backgroundColor: "#18181b" }}
                        className="h-9 px-4 rounded-xl text-white hover:bg-zinc-800 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Plus size={14} strokeWidth={2} />
                        <span>Add First Bank Account or UPI</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(gymData.bankAccounts || []).map((account) => {
                        const isRevealed = revealedAccountIds.has(account.id);
                        const isPrimaryInflow = !!account.isPrimaryInflow;
                        const isPrimaryOutflow = !!account.isPrimaryOutflow;
                        const hasBank = Boolean(account.accountNumber);
                        const hasUpi = Boolean(account.upiId);
                        const isUpiOnly = hasUpi && !hasBank;
                        const isBankOnly = hasBank && !hasUpi;
                        const isCombined = hasBank && hasUpi;
                        const isDualPurpose = account.role === "both" || (isPrimaryInflow && isPrimaryOutflow);

                        return (
                          <div 
                            key={account.id} 
                            className="rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all shadow-2xs overflow-hidden"
                          >
                            {/* Card Main Body */}
                            <div className="p-5 space-y-4">
                              {/* Top row: Icon, Entity Name, Method Badge & Purpose Badges */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 font-bold text-xs shrink-0 shadow-2xs">
                                    {isUpiOnly ? (
                                      <Smartphone size={18} strokeWidth={1.5} className="text-purple-700" />
                                    ) : (
                                      <Landmark size={18} strokeWidth={1.5} className="text-zinc-800" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-bold text-sm text-zinc-900">
                                        {account.bankName || (isUpiOnly ? "Merchant UPI" : "Bank")}
                                      </h4>
                                      {/* Method Badge */}
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 font-medium">
                                        {isUpiOnly ? "UPI Only" : isBankOnly ? "Bank Account" : "Combined Bank + UPI"}
                                      </span>
                                      {/* Verification Status Badge */}
                                      {account.verificationStatus === "VERIFIED" ? (
                                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-1 font-mono">
                                          <ShieldCheck size={10} strokeWidth={2} />
                                          Verified
                                        </span>
                                      ) : account.verificationStatus === "DISABLED" ? (
                                        <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-1.5 py-0.2 rounded border border-zinc-200 flex items-center gap-1 font-mono">
                                          Disabled
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-1 font-mono">
                                          <AlertCircle size={10} strokeWidth={2} />
                                          Unverified
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-zinc-500 font-medium mt-0.5">
                                      {account.accountHolderName}
                                    </div>
                                  </div>
                                </div>

                                {/* Purpose Badges */}
                                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                  {isDualPurpose ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold font-mono flex items-center gap-1.5 shadow-2xs">
                                      <ArrowDownLeft size={11} strokeWidth={2.5} />
                                      <ArrowUpRight size={11} strokeWidth={2.5} />
                                      Dual Purpose (Inflow + Payroll)
                                    </span>
                                  ) : (
                                    <>
                                      {isPrimaryInflow && (
                                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold font-mono flex items-center gap-1.5 shadow-2xs">
                                          <ArrowDownLeft size={12} strokeWidth={2.5} />
                                          Fee Inflow
                                        </span>
                                      )}
                                      {isPrimaryOutflow && (
                                        <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-semibold font-mono flex items-center gap-1.5 shadow-2xs">
                                          <ArrowUpRight size={12} strokeWidth={2.5} />
                                          Trainer Payroll
                                        </span>
                                      )}
                                      {!isPrimaryInflow && !isPrimaryOutflow && (
                                        <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-600 border border-zinc-200 text-xs font-medium">
                                          Standby Account
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Coordinates Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-100 text-xs">
                                {hasBank ? (
                                  <>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider font-mono">Account Number</span>
                                      <div className="font-mono font-bold text-zinc-900 flex items-center gap-2">
                                        <span>
                                          {isRevealed
                                            ? account.accountNumber
                                            : `•••• •••• •••• ${account.accountNumber?.slice(-4) || "0000"}`}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleRevealAccount(account.id)}
                                          className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                          title={isRevealed ? "Mask" : "Reveal"}
                                        >
                                          {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyText(account.accountNumber, "acc", account.id)}
                                          className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                          title="Copy Account Number"
                                        >
                                          {copiedAccNum === account.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                        </button>
                                      </div>
                                    </div>

                                    <div className="space-y-0.5">
                                      <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider font-mono">IFSC & Branch</span>
                                      <div className="font-mono font-semibold text-zinc-900 flex items-center gap-2">
                                        <span>{account.ifscCode}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyText(account.ifscCode, "ifsc", account.id)}
                                          className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                          title="Copy IFSC"
                                        >
                                          <Copy size={12} strokeWidth={2} />
                                        </button>
                                      </div>
                                      <div className="text-[11px] text-zinc-500 truncate" title={account.branchName}>
                                        {account.branchName || "Main Commercial Branch"}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="sm:col-span-2 space-y-0.5">
                                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider font-mono">Stand-alone Rail</span>
                                    <span className="text-xs text-zinc-600 block">
                                      Direct UPI collection handle. Zero bank account credentials required or stored.
                                    </span>
                                  </div>
                                )}

                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider font-mono">UPI VPA Handle</span>
                                  {account.upiId ? (
                                    <div className="font-mono font-semibold text-zinc-900 flex items-center gap-2">
                                      <span className="truncate max-w-[180px]">{account.upiId}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(account.upiId, "upi", account.id)}
                                        className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                        title="Copy UPI"
                                      >
                                        {copiedUpiId === account.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400 text-xs">No UPI identifier linked</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Card Bottom Action Bar */}
                            <div className="bg-zinc-50/90 px-5 py-3 border-t border-zinc-200/70 flex flex-wrap items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2">
                                {hasBank && !isPrimaryInflow && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryInflow(account.id)}
                                    style={{ border: "1px solid #d1fae5", backgroundColor: "#ecfdf5" }}
                                    className="h-8 px-3 rounded-lg text-emerald-800 hover:text-emerald-900 hover:bg-emerald-100 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <ArrowDownLeft size={12} strokeWidth={2.5} />
                                    <span>Set as Fee Inflow</span>
                                  </button>
                                )}
                                {hasBank && !isPrimaryOutflow && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetPrimaryOutflow(account.id)}
                                    style={{ border: "1px solid #e4e4e7", backgroundColor: "#ffffff" }}
                                    className="h-8 px-3 rounded-lg hover:bg-zinc-100 text-zinc-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  >
                                    <ArrowUpRight size={12} strokeWidth={2.5} />
                                    <span>Set as Payroll</span>
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2 ml-auto">
                                {account.upiId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedQrAccount(account);
                                      setIsUpiQrModalOpen(true);
                                    }}
                                    style={{ border: "1px solid #e4e4e7", backgroundColor: "#ffffff" }}
                                    className="h-8 px-3 rounded-lg hover:bg-zinc-100 text-zinc-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                    title="View QR Standee"
                                  >
                                    <QrCode size={13} strokeWidth={2} />
                                    <span>QR Standee</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditAccountModal(account)}
                                  style={{ border: "1px solid #e4e4e7", backgroundColor: "#ffffff" }}
                                  className="h-8 px-3 rounded-lg hover:bg-zinc-100 text-zinc-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  title="Edit Account Details"
                                >
                                  <Edit3 size={12} strokeWidth={2} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAccountToDelete(account)}
                                  style={{ border: "1px solid #fee2e2", backgroundColor: "#ffffff" }}
                                  className="h-8 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs text-zinc-600 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Disconnect Account"
                                >
                                  <Trash2 size={12} strokeWidth={2} />
                                  <span>Disconnect</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* INVITING DASHED CARD: EASILY ADD ANOTHER METHOD */}
                      <button
                        type="button"
                        onClick={() => openAddAccountModal("both")}
                        style={{ border: "1px dashed #d4d4d8", backgroundColor: "#fafafa" }}
                        className="w-full p-5 rounded-xl hover:bg-zinc-100 transition-all flex flex-col sm:flex-row items-center justify-between gap-3 text-left cursor-pointer group shadow-2xs"
                      >
                        <div className="flex items-center gap-3.5">
                          <div 
                            style={{ border: "1px solid #e4e4e7", backgroundColor: "#ffffff" }}
                            className="w-9 h-9 rounded-lg text-zinc-700 group-hover:text-zinc-900 group-hover:border-zinc-400 flex items-center justify-center transition-colors shadow-2xs shrink-0"
                          >
                            <Plus size={16} strokeWidth={2} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-900 group-hover:text-black">
                              Link Another Payment Method, Bank Account, or UPI Handle
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              Add separate accounts for multi-branch dues, pro-shop POS, or secondary business entities.
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-zinc-800 group-hover:text-zinc-950 flex items-center gap-1.5 shrink-0 font-mono">
                          <span>Add Method</span>
                          <ArrowRight size={13} strokeWidth={2} />
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. SECURITY, GOVERNANCE & NON-CUSTODIAL SAFEGUARDS (FAQ ACCORDION) */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-5">
                  {/* Top Bar: Title, Badges, and Expand/Collapse Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <ShieldCheck size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Security & Non-Custodial Data Policy</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 font-medium">
                            RBI & NPCI Compliant
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Common questions regarding direct settlement, banking permissions, and non-custodial safeguards.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(prev => (prev ? null : "all"))}
                      className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 px-3 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap"
                    >
                      {expandedFaqId ? "Collapse All" : "Expand All"}
                    </button>
                  </div>

                  {/* FAQ Interactive Accordion Drop-Boxes */}
                  <div className="space-y-2">
                    {[
                      {
                        id: "faq-fee-settlement",
                        icon: Wallet,
                        question: "How does member fee settlement work?",
                        topic: "Direct Fee Settlement",
                        tag: "Inflow Rail",
                        tagColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
                        answer: "Member dues, package renewals, and QR payments route directly to your bank account with zero intermediate escrow holding or settlement delay. GymDeck charges 0% platform commission on direct transfers and never pools member funds.",
                      },
                      {
                        id: "faq-trainer-payouts",
                        icon: Users,
                        question: "How are trainer salaries and staff payouts disbursed?",
                        topic: "Trainer Salary Payouts",
                        tag: "Outflow Rail",
                        tagColor: "bg-zinc-100 text-zinc-700 border-zinc-200",
                        answer: "Generates batch IMPS and NEFT salary instructions executed exclusively following your explicit administrative OTP or biometric authorization. No salary batch can be released without dual-admin confirmation.",
                      },
                      {
                        id: "faq-reconciliation",
                        icon: FileCheck2,
                        question: "How does automated invoice reconciliation work?",
                        topic: "Automated Reconciliation",
                        tag: "GST Compliant",
                        tagColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
                        answer: "Correlates incoming bank UTR reference numbers against outstanding member invoices to balance ledgers and produce tax-ready financial books. Invoices and receipts are settled only after authorized staff verification against your bank statement.",
                      },
                      {
                        id: "faq-zero-custody",
                        icon: ShieldAlert,
                        question: "Does GymDeck ever hold, pool, or custody gym funds?",
                        topic: "Zero Capital Custody",
                        tag: "Non-Custodial",
                        tagColor: "bg-amber-50 text-amber-800 border-amber-200",
                        answer: "We never hold, pool, or touch your money. Funds move directly bank-to-bank through RBI-regulated commercial rails without proprietary wallets. Holding Escrow is strictly ₹0.00.",
                      },
                      {
                        id: "faq-zero-autodebit",
                        icon: LockKeyhole,
                        question: "Can money ever be automatically debited from your account?",
                        topic: "Zero Auto-Debit Authority",
                        tag: "No Standing Mandates",
                        tagColor: "bg-zinc-100 text-zinc-700 border-zinc-200",
                        answer: "No standing debit mandates on your account. Funds can never be transferred out without your explicit biometric or OTP confirmation. Pull transactions are structurally impossible.",
                      },
                      {
                        id: "faq-zero-credentials",
                        icon: KeyRound,
                        question: "What banking credentials and secrets does GymDeck store?",
                        topic: "Zero Credential Storage",
                        tag: "Zero Secret Retention",
                        tagColor: "bg-zinc-100 text-zinc-700 border-zinc-200",
                        answer: "We strictly never request or store corporate Net Banking passwords, debit card PINs, CVVs, or UPI MPIN credentials. Account numbers are encrypted at rest with hardware AES-256 and masked (•••• 1234) across all interfaces.",
                      },
                    ].map((faq) => {
                      const isOpen = expandedFaqId === "all" || expandedFaqId === faq.id;
                      const IconComp = faq.icon;

                      return (
                        <div
                          key={faq.id}
                          className={`rounded-xl border transition-all duration-150 overflow-hidden ${
                            isOpen
                              ? "border-zinc-300 bg-white shadow-2xs"
                              : "border-zinc-200/80 bg-zinc-50/60 hover:bg-zinc-50 hover:border-zinc-300"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaq(faq.id)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left gap-3 cursor-pointer select-none"
                            aria-expanded={isOpen}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                  isOpen
                                    ? "bg-zinc-900 text-white"
                                    : "bg-white text-zinc-700 border border-zinc-200/80 shadow-2xs"
                                }`}
                              >
                                <IconComp size={14} strokeWidth={2} />
                              </div>
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="text-xs font-bold text-zinc-900">{faq.question}</span>
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${faq.tagColor}`}>
                                  {faq.tag}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2.5">
                              <span className="text-[10px] text-zinc-400 font-mono hidden md:inline">{faq.topic}</span>
                              <ChevronDown
                                size={14}
                                strokeWidth={2}
                                className={`text-zinc-400 transition-transform duration-200 ${
                                  isOpen ? "rotate-180 text-zinc-800" : ""
                                }`}
                              />
                            </div>
                          </button>

                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-3.5 pt-1 border-t border-zinc-100 bg-white">
                                  <p className="text-xs text-zinc-600 leading-relaxed pl-10">
                                    {faq.answer}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3. TECHNICAL SECURITY & REGULATORY CREDENTIALS GRID */}
                  <div className="pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Badge 1 */}
                      <div className="p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 flex items-start gap-3 hover:bg-zinc-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-800 flex items-center justify-center shrink-0 shadow-2xs">
                          <Lock size={15} strokeWidth={2} />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-zinc-900 text-xs truncate">256-Bit Hardware AES</div>
                          <div className="text-[10px] text-zinc-400 font-mono">FIPS 140-2 Level 3 HSM</div>
                          <p className="text-[10px] text-zinc-500 leading-snug pt-0.5">
                            Bank account coordinates encrypted at rest using dedicated hardware security modules.
                          </p>
                        </div>
                      </div>

                      {/* Badge 2 */}
                      <div className="p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 flex items-start gap-3 hover:bg-zinc-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-800 flex items-center justify-center shrink-0 shadow-2xs">
                          <Network size={15} strokeWidth={2} />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-zinc-900 text-xs truncate">TLS 1.3 Strict Tunnel</div>
                          <div className="text-[10px] text-zinc-400 font-mono">Perfect Forward Secrecy</div>
                          <p className="text-[10px] text-zinc-500 leading-snug pt-0.5">
                            End-to-end cryptographic transit tunneling protecting every API and banking handshake.
                          </p>
                        </div>
                      </div>

                      {/* Badge 3 */}
                      <div className="p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 flex items-start gap-3 hover:bg-zinc-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-800 flex items-center justify-center shrink-0 shadow-2xs">
                          <Landmark size={15} strokeWidth={2} />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-zinc-900 text-xs truncate">RBI PA/PG Framework</div>
                          <div className="text-[10px] text-zinc-400 font-mono">Circular RBI/2020-21/79</div>
                          <p className="text-[10px] text-zinc-500 leading-snug pt-0.5">
                            Operates under strict non-custodial software guidelines for direct merchant settlement.
                          </p>
                        </div>
                      </div>

                      {/* Badge 4 */}
                      <div className="p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-200/80 flex items-start gap-3 hover:bg-zinc-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 text-zinc-800 flex items-center justify-center shrink-0 shadow-2xs">
                          <CheckCircle size={15} strokeWidth={2} />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-zinc-900 text-xs truncate">NPCI UPI 2.0 Rails</div>
                          <div className="text-[10px] text-zinc-400 font-mono">Direct Merchant Node</div>
                          <p className="text-[10px] text-zinc-500 leading-snug pt-0.5">
                            Native interoperable QR architecture depositing straight into your commercial account.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ──────── TAB 7: SOCIAL MEDIA ──────── */}
            {activeTab === "Social Media" && (
              <motion.div 
                key="tab-socials"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3.5 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                      <Share2 size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-900 tracking-tight">Social Media & Community Channels</h2>
                      <p className="text-xs text-zinc-500 font-normal">Handles linked on member invoices and web directories</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200/80 text-zinc-700 flex items-center justify-center">
                        <Instagram size={16} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">Instagram Handle</label>
                        <input 
                          type="text" 
                          value={gymData.socials.instagram} 
                          placeholder="e.g. @yourgym (Instagram handle or username)"
                          onChange={(e) => handleSocialChange('instagram', e.target.value)}
                          className="w-full bg-transparent font-semibold text-xs text-zinc-900 border-none p-0 focus:ring-0 placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200/80 text-zinc-700 flex items-center justify-center">
                        <Facebook size={16} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">Facebook Page</label>
                        <input 
                          type="text" 
                          value={gymData.socials.facebook} 
                          placeholder="e.g. facebook.com/yourgymfitness (Facebook page URL or handle)"
                          onChange={(e) => handleSocialChange('facebook', e.target.value)}
                          className="w-full bg-transparent font-semibold text-xs text-zinc-900 border-none p-0 focus:ring-0 placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200/80 text-zinc-700 flex items-center justify-center">
                        <Youtube size={16} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">YouTube Channel</label>
                        <input 
                          type="text" 
                          value={gymData.socials.youtube} 
                          placeholder="e.g. @YourGymChannel (Official YouTube channel)"
                          onChange={(e) => handleSocialChange('youtube', e.target.value)}
                          className="w-full bg-transparent font-semibold text-xs text-zinc-900 border-none p-0 focus:ring-0 placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200/80 text-zinc-700 flex items-center justify-center">
                        <Twitter size={16} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">X (Twitter)</label>
                        <input 
                          type="text" 
                          value={gymData.socials.twitter} 
                          placeholder="e.g. @yourgym (X / Twitter handle)"
                          onChange={(e) => handleSocialChange('twitter', e.target.value)}
                          className="w-full bg-transparent font-semibold text-xs text-zinc-900 border-none p-0 focus:ring-0 placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

          </AnimatePresence>

        </main>
      </div>

      {/* BRAND SIGNATURE FOOTER */}
      <BrandFooter />

      {/* 4. STICKY BOTTOM SAVE BAR */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 inset-x-0 z-[200] max-w-2xl mx-auto px-4"
          >
            <div className="bg-zinc-900 text-white rounded-xl p-3 border border-zinc-800 shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
                  <Info size={15} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">Unsaved Changes</div>
                  <div className="text-[10px] text-zinc-400">Profile fields have been updated</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setHasChanges(false)}
                  className="h-8 px-3 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  className="h-8 px-4 rounded-lg bg-white text-zinc-900 text-[10px] font-semibold uppercase tracking-wider hover:bg-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save size={13} strokeWidth={1.5} />
                  <span>Publish Changes</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-6 right-8 z-[300] bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-zinc-800 flex items-center gap-2.5 text-xs font-medium"
          >
            <CheckCircle2 size={15} strokeWidth={1.75} className="text-zinc-200" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. LUXURY QR PASS MODAL (Portal to document.body so sidebar is behind dark layer) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isQrModalOpen && (
            <motion.div 
              key="gym-qr-pass-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQrModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
              style={{ zIndex: 100000 }}
            >
              <motion.div 
                key="gym-qr-pass-card"
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="luxury-profile-card select-none relative overflow-hidden"
                style={{
                  background: 'radial-gradient(circle at 50% 28%, #163a65 0%, #0d2544 38%, #08172c 70%, #030814 100%)',
                  boxShadow: '0 40px 120px -20px rgba(0,0,0,0.95), 0 0 60px -10px rgba(56,189,248,0.35)'
                }}
              >
                {/* Top Right: Close Button */}
                <button 
                  type="button" 
                  className="btn-card-top-close" 
                  onClick={() => setIsQrModalOpen(false)} 
                  aria-label="Close"
                  style={{
                    position: 'absolute',
                    top: '32px',
                    right: '32px',
                    zIndex: 50,
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={20} strokeWidth={2.5} />
                </button>

                {/* Subtle Concentric radar ripples background */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 440 647">
                  <circle cx="220" cy="324" r="140" fill="none" stroke="rgba(255, 255, 255, 0.28)" strokeWidth="1.2" strokeDasharray="4 4" />
                  <circle cx="220" cy="324" r="195" fill="none" stroke="rgba(186, 230, 253, 0.2)" strokeWidth="1.5" />
                  <circle cx="220" cy="324" r="260" fill="none" stroke="rgba(125, 211, 252, 0.14)" strokeWidth="1.8" />
                  <circle cx="220" cy="324" r="335" fill="none" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="2" />
                  <circle cx="220" cy="324" r="420" fill="none" stroke="rgba(14, 165, 233, 0.06)" strokeWidth="2.5" />
                </svg>

                {/* Ambient glow spotlight behind the pass */}
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[80px] pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(56, 189, 248, 0.32) 0%, rgba(14, 165, 233, 0.16) 45%, rgba(99, 102, 241, 0.1) 70%, transparent 100%)' }}
                />

                {/* Center: ONLY THE QR CODE (Properly Sized & Mathematically Centered) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div 
                    className="pointer-events-auto p-5 bg-white rounded-[28px] flex items-center justify-center transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.55), 0 0 45px rgba(56, 189, 248, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.95)',
                      border: '1.5px solid rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    <QrCode size={210} strokeWidth={1.8} className="text-zinc-950" />
                  </div>
                </div>

                {/* Bottom Left: Download Button (Positioned at bottom-left inside card) */}
                <div 
                  className="download-btn-container pos-left"
                  style={{
                    position: 'absolute',
                    bottom: '32px',
                    left: '32px',
                    right: 'auto',
                    top: 'auto',
                    margin: 0,
                    zIndex: 50
                  }}
                >
                  <button 
                    className="btn-card-bottom-download" 
                    type="button" 
                    aria-label="Download QR Pass"
                    onClick={handleDownloadPass}
                    title="Download Pass"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.12)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.22)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <div className="icon-wrap-main">
                      <svg className="icon-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ width: '20px', height: '20px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                    </div>
                  </button>
                  <span className="download-tooltip">Download Pass</span>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 7. ADD / EDIT BANK ACCOUNT & UPI MODAL */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isAccountModalOpen && (
            <motion.div 
              key="account-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAccountModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
              style={{ zIndex: 100000 }}
            >
              <motion.div 
                key="account-modal-card"
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] my-auto"
              >
                {/* Header */}
                <div className="p-5 border-b border-zinc-100 flex items-start justify-between bg-zinc-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-2xs shrink-0">
                      {modalStep === 1 && <ArrowUpDown size={18} strokeWidth={1.75} />}
                      {modalStep === 2 && <Sliders size={18} strokeWidth={1.75} />}
                      {modalStep === 3 && <Edit3 size={18} strokeWidth={1.75} />}
                      {modalStep === 4 && <ShieldCheck size={18} strokeWidth={1.75} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
                        {editingAccountId ? "Edit Payment Destination" : "Add Payment Method"}
                      </h3>
                      <p className="text-xs text-zinc-500 font-normal">
                        {modalStep === 1 && "Step 1 of 4: Select financial purpose and transaction role"}
                        {modalStep === 2 && "Step 2 of 4: Choose the payment method or settlement rail"}
                        {modalStep === 3 && "Step 3 of 4: Enter only relevant method coordinates"}
                        {modalStep === 4 && "Step 4 of 4: Review financial destination and confirm"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(false)}
                    className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>

                {/* 4-Step Indicator Stepper */}
                <div className="px-5 py-2.5 bg-zinc-100/70 border-b border-zinc-200/80 flex items-center justify-between gap-1 overflow-x-auto select-none">
                  {[
                    { num: 1, label: "Purpose" },
                    { num: 2, label: "Method" },
                    { num: 3, label: "Coordinates" },
                    { num: 4, label: "Review & Save" }
                  ].map((s) => (
                    <div 
                      key={s.num}
                      onClick={() => {
                        if (s.num < modalStep) {
                          setModalStep(s.num);
                        } else if (s.num === 4 && modalStep === 3) {
                          if (validateStep3()) setModalStep(4);
                        }
                      }}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                        modalStep === s.num
                          ? "bg-zinc-900 text-white shadow-2xs cursor-default"
                          : modalStep > s.num
                          ? "bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                          : "text-zinc-400 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${
                        modalStep === s.num
                          ? "bg-white text-zinc-900"
                          : modalStep > s.num
                          ? "bg-emerald-100 text-emerald-800 font-bold"
                          : "bg-zinc-200 text-zinc-600"
                      }`}>
                        {modalStep > s.num ? "✓" : s.num}
                      </span>
                      <span className="whitespace-nowrap">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Form Body - Step Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                  {/* STEP 1: FINANCIAL PURPOSE */}
                  {modalStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                          Select Financial Purpose
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Specify how this destination will be used in your gym's monetary flow.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3.5">
                        {/* Option 1: Inflow */}
                        <div 
                          onClick={() => setAccountFormData(prev => ({ 
                            ...prev, 
                            purpose: "inflow", 
                            role: "inflow",
                            isPrimaryInflow: true,
                            isPrimaryOutflow: false
                          }))}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            accountFormData.purpose === "inflow"
                              ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900 shadow-xs"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            accountFormData.purpose === "inflow"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-zinc-100 text-zinc-600"
                          }`}>
                            <ArrowDownLeft size={18} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs font-bold text-zinc-900">Receive Money (Member Fees & Dues)</h5>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                MEMBER INFLOW
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                              Collect member subscriptions, package renewals, walk-ins, and POS payments.
                            </p>
                          </div>
                        </div>

                        {/* Option 2: Outflow */}
                        <div 
                          onClick={() => setAccountFormData(prev => ({ 
                            ...prev, 
                            purpose: "outflow", 
                            role: "outflow",
                            isPrimaryInflow: false,
                            isPrimaryOutflow: true,
                            method: prev.method === "CARD_GATEWAY" ? "BANK_TRANSFER" : prev.method
                          }))}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            accountFormData.purpose === "outflow"
                              ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900 shadow-xs"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            accountFormData.purpose === "outflow"
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-600"
                          }`}>
                            <ArrowUpRight size={18} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs font-bold text-zinc-900">Send Money (Trainer Payroll & Payouts)</h5>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
                                PAYROLL OUTFLOW
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                              Disburse trainer base salaries, PT commissions, contractor fees, and staff stipends.
                            </p>
                          </div>
                        </div>

                        {/* Option 3: Dual Purpose (Both) */}
                        <div 
                          onClick={() => setAccountFormData(prev => ({ 
                            ...prev, 
                            purpose: "both", 
                            role: "both",
                            isPrimaryInflow: true,
                            isPrimaryOutflow: true
                          }))}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            accountFormData.purpose === "both"
                              ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900 shadow-xs"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            accountFormData.purpose === "both"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-zinc-100 text-zinc-600"
                          }`}>
                            <ArrowUpDown size={18} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs font-bold text-zinc-900">Dual Purpose (Inflow + Outflow)</h5>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                DUAL PURPOSE
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                              Use a single commercial business account to both receive member fees and disburse trainer payroll.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: PAYMENT METHOD SELECTION */}
                  {modalStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                          Select Payment Method
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Choose the specific payment rail. You will only configure fields relevant to this method.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Method: UPI Only */}
                        <div 
                          onClick={() => setAccountFormData(prev => ({ ...prev, method: "UPI" }))}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            accountFormData.method === "UPI"
                              ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900 shadow-xs"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          }`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900">
                                <QrCode size={18} strokeWidth={1.75} />
                              </div>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                UPI Rail
                              </span>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-zinc-900">UPI Only (VPA & Standee QR)</h5>
                              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                                Direct merchant UPI ID handle and scannable countertop QR code. No bank account number needed.
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-zinc-100 text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                            <Check size={11} className="text-emerald-600" />
                            <span>Zero bank details required</span>
                          </div>
                        </div>

                        {/* Method: Bank Transfer Only */}
                        <div 
                          onClick={() => setAccountFormData(prev => ({ ...prev, method: "BANK_TRANSFER" }))}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            accountFormData.method === "BANK_TRANSFER"
                              ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900 shadow-xs"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          }`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900">
                                <Landmark size={18} strokeWidth={1.75} />
                              </div>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                                Direct Bank
                              </span>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-zinc-900">Bank Account Only</h5>
                              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                                Direct transfer via NEFT, RTGS, or IMPS. Encrypted account number & IFSC code. No UPI ID required.
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-zinc-100 text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                            <Check size={11} className="text-emerald-600" />
                            <span>AES-256 encrypted at rest</span>
                          </div>
                        </div>

                        {/* Method: Combined (Bank + UPI) */}
                        <div 
                          onClick={() => setAccountFormData(prev => ({ ...prev, method: "COMBINED" }))}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            accountFormData.method === "COMBINED"
                              ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900 shadow-xs"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          }`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900">
                                <Wallet size={18} strokeWidth={1.75} />
                              </div>
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200">
                                Complete
                              </span>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-zinc-900">Combined (Bank + UPI)</h5>
                              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                                Configure both commercial bank account coordinates and a linked UPI VPA on the same record.
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-2.5 border-t border-zinc-100 text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                            <Check size={11} className="text-emerald-600" />
                            <span>Dual rails on single profile</span>
                          </div>
                        </div>

                        {/* Method: Card Gateway (Inflow/Both only) */}
                        {accountFormData.purpose !== "outflow" && (
                          <div 
                            onClick={() => setAccountFormData(prev => ({ ...prev, method: "CARD_GATEWAY" }))}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                              accountFormData.method === "CARD_GATEWAY"
                                ? "border-zinc-900 bg-zinc-50/80 ring-1 ring-zinc-900 shadow-xs"
                                : "border-zinc-200 bg-white hover:border-zinc-300"
                            }`}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900">
                                  <CreditCard size={18} strokeWidth={1.75} />
                                </div>
                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  COMING SOON / NOT CONNECTED
                                </span>
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-zinc-900">Card Payments (Gateway)</h5>
                                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                                  Payment gateway integration is currently in development. Debit and credit card payments cannot be accepted until an authorized payment aggregator is connected.
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-zinc-100 text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                              <Info size={11} className="text-amber-600" />
                              <span>Zero card credentials stored</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: METHOD-SPECIFIC COORDINATES CONFIGURATION */}
                  {modalStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                          {accountFormData.method === "UPI" && "Configure UPI Receiving Coordinates"}
                          {accountFormData.method === "BANK_TRANSFER" && "Configure Bank Account Coordinates"}
                          {accountFormData.method === "COMBINED" && "Configure Bank Account & UPI Coordinates"}
                          {accountFormData.method === "CARD_GATEWAY" && "Card Gateway Provider Connection"}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {accountFormData.method === "UPI" && "Enter only your UPI ID and display name. No bank details required."}
                          {accountFormData.method === "BANK_TRANSFER" && "Enter account coordinates. Encrypted at rest using AES-256-GCM."}
                          {accountFormData.method === "COMBINED" && "Enter commercial bank coordinates and your primary merchant UPI ID."}
                          {accountFormData.method === "CARD_GATEWAY" && "Connect an RBI-authorized payment aggregator for card acceptance."}
                        </p>
                      </div>

                      {/* --- CASE A: UPI ONLY --- */}
                      {accountFormData.method === "UPI" && (
                        <div className="space-y-4">
                          {/* Beneficiary Display Name */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-zinc-700">Beneficiary Display Name (Shows in UPI Apps)</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                                <Building2 size={15} strokeWidth={1.5} />
                              </div>
                              <input 
                                type="text" 
                                value={accountFormData.accountHolderName} 
                                placeholder="e.g. Iron Pulse Fitness"
                                onChange={(e) => setAccountFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                                className={`w-full h-10 pl-10 pr-3.5 bg-zinc-50 border rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal ${
                                  accountFormErrors.accountHolderName ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                }`}
                              />
                            </div>
                            {accountFormErrors.accountHolderName && (
                              <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.accountHolderName}</span>
                            )}
                          </div>

                          {/* UPI VPA ID */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-zinc-700">Merchant UPI ID / VPA Handle</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                                <QrCode size={15} strokeWidth={1.5} />
                              </div>
                              <input 
                                type="text" 
                                value={accountFormData.upiId} 
                                placeholder="e.g. gymname@okhdfcbank"
                                onChange={(e) => setAccountFormData(prev => ({ ...prev, upiId: e.target.value.toLowerCase().trim() }))}
                                className={`w-full h-10 pl-10 pr-3.5 bg-zinc-50 border rounded-lg text-xs font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal placeholder:font-sans ${
                                  accountFormErrors.upiId ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                }`}
                              />
                            </div>
                            {accountFormErrors.upiId && (
                              <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.upiId}</span>
                            )}
                            <span className="text-[10px] text-zinc-400 block font-normal">
                              Compatible with Google Pay, PhonePe, Paytm, BHIM, and any bank UPI app.
                            </span>
                          </div>

                          {/* Live Vector QR Preview Inline */}
                          {accountFormData.upiId && accountFormData.upiId.includes("@") && (
                            <div className="p-4 rounded-xl bg-zinc-50/80 border border-zinc-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                              <div className="p-2 bg-white rounded-lg border border-zinc-200 shrink-0 shadow-2xs">
                                <UpiQrCodeSvg 
                                  vpa={accountFormData.upiId} 
                                  name={accountFormData.accountHolderName || gymData.name} 
                                  size={110} 
                                />
                              </div>
                              <div>
                                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mb-1 font-semibold">
                                  LIVE VALID VECTOR QR GENERATED
                                </div>
                                <div className="text-xs font-bold text-zinc-900">Instant Merchant Standee QR</div>
                                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                                  This authentic vector QR will be scannable at your front desk countertop and dynamically generated on member dues invoices.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Primary Inflow Checkbox */}
                          <div className="pt-2 border-t border-zinc-100">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={accountFormData.isPrimaryInflow}
                                onChange={(e) => setAccountFormData(prev => ({ ...prev, isPrimaryInflow: e.target.checked }))}
                                className="w-4 h-4 mt-0.5 rounded text-zinc-900 focus:ring-0 cursor-pointer"
                              />
                              <div>
                                <div className="text-xs font-semibold text-zinc-900">Set as Primary UPI Receiving Destination</div>
                                <div className="text-[10px] text-zinc-500">Member dues and countertop QR will route to this UPI ID by default.</div>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* --- CASE B: BANK TRANSFER ONLY --- */}
                      {accountFormData.method === "BANK_TRANSFER" && (
                        <div className="space-y-4">
                          {/* Beneficiary Legal Name */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-zinc-700">Account Holder / Legal Business Name</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                                <Building2 size={15} strokeWidth={1.5} />
                              </div>
                              <input 
                                type="text" 
                                value={accountFormData.accountHolderName} 
                                placeholder="e.g. Iron Pulse Fitness LLP"
                                onChange={(e) => setAccountFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                                className={`w-full h-10 pl-10 pr-3.5 bg-zinc-50 border rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal ${
                                  accountFormErrors.accountHolderName ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                }`}
                              />
                            </div>
                            {accountFormErrors.accountHolderName && (
                              <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.accountHolderName}</span>
                            )}
                          </div>

                          {/* Bank Name & Account Type */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-zinc-700">Bank Name</label>
                              <CustomDropdown
                                id="account-bank-dropdown"
                                icon={Landmark}
                                searchable={true}
                                value={accountFormData.bankName}
                                options={BANK_OPTIONS}
                                onChange={(val) => setAccountFormData(prev => ({ ...prev, bankName: val }))}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-zinc-700">Account Type</label>
                              <CustomDropdown
                                id="account-type-dropdown"
                                icon={CreditCard}
                                value={accountFormData.accountType}
                                options={ACCOUNT_TYPE_OPTIONS}
                                onChange={(val) => setAccountFormData(prev => ({ ...prev, accountType: val }))}
                              />
                            </div>
                          </div>

                          {/* Account Number & Confirm */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-zinc-700">Account Number</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                                  <CreditCard size={15} strokeWidth={1.5} />
                                </div>
                                <input 
                                  type="text" 
                                  value={accountFormData.accountNumber} 
                                  placeholder="e.g. 50200084920193"
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, accountNumber: e.target.value.replace(/\s+/g, '') }))}
                                  className={`w-full h-10 pl-10 pr-3.5 bg-zinc-50 border rounded-lg text-xs font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal placeholder:font-sans ${
                                    accountFormErrors.accountNumber ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                  }`}
                                />
                              </div>
                              {accountFormErrors.accountNumber && (
                                <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.accountNumber}</span>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-zinc-700">Re-enter Account Number</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                                  <CreditCard size={15} strokeWidth={1.5} />
                                </div>
                                <input 
                                  type="text" 
                                  value={accountFormData.confirmAccountNumber} 
                                  placeholder="Re-type account number"
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, confirmAccountNumber: e.target.value.replace(/\s+/g, '') }))}
                                  className={`w-full h-10 pl-10 pr-3.5 bg-zinc-50 border rounded-lg text-xs font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal placeholder:font-sans ${
                                    accountFormErrors.confirmAccountNumber ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                  }`}
                                />
                              </div>
                              {accountFormErrors.confirmAccountNumber && (
                                <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.confirmAccountNumber}</span>
                              )}
                            </div>
                          </div>

                          {/* IFSC Code & Branch */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold text-zinc-700">IFSC Code</label>
                                <span className="text-[10px] text-zinc-400 font-mono">11 Characters</span>
                              </div>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                                  <Landmark size={15} strokeWidth={1.5} />
                                </div>
                                <input 
                                  type="text" 
                                  maxLength={11}
                                  value={accountFormData.ifscCode} 
                                  placeholder="e.g. HDFC0000240"
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                                  className={`w-full h-10 pl-10 pr-3.5 bg-zinc-50 border rounded-lg text-xs font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal placeholder:font-sans uppercase ${
                                    accountFormErrors.ifscCode ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                  }`}
                                />
                              </div>
                              {accountFormErrors.ifscCode && (
                                <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.ifscCode}</span>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-zinc-700">Branch Name & City (Optional)</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                                  <MapPin size={15} strokeWidth={1.5} />
                                </div>
                                <input 
                                  type="text" 
                                  value={accountFormData.branchName} 
                                  placeholder="e.g. Indiranagar, Bengaluru"
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, branchName: e.target.value }))}
                                  className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Primary Routing Checkboxes */}
                          <div className="pt-2 border-t border-zinc-100 space-y-2">
                            {(accountFormData.purpose === "inflow" || accountFormData.purpose === "both") && (
                              <label className="flex items-start gap-2.5 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={accountFormData.isPrimaryInflow}
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, isPrimaryInflow: e.target.checked }))}
                                  className="w-4 h-4 mt-0.5 rounded text-zinc-900 focus:ring-0 cursor-pointer"
                                />
                                <div>
                                  <div className="text-xs font-semibold text-zinc-900">Set as Primary Member Fee Inflow Destination</div>
                                  <div className="text-[10px] text-zinc-500">Member bank transfer instructions will show these account coordinates.</div>
                                </div>
                              </label>
                            )}

                            {(accountFormData.purpose === "outflow" || accountFormData.purpose === "both") && (
                              <label className="flex items-start gap-2.5 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={accountFormData.isPrimaryOutflow}
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, isPrimaryOutflow: e.target.checked }))}
                                  className="w-4 h-4 mt-0.5 rounded text-zinc-900 focus:ring-0 cursor-pointer"
                                />
                                <div>
                                  <div className="text-xs font-semibold text-zinc-900">Set as Primary Trainer Payroll Outflow Source</div>
                                  <div className="text-[10px] text-zinc-500">Account used for trainer salary and PT commission batch payouts.</div>
                                </div>
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      {/* --- CASE C: COMBINED (BANK + UPI) --- */}
                      {accountFormData.method === "COMBINED" && (
                        <div className="space-y-5">
                          {/* Section A: Bank Coordinates */}
                          <div className="p-4 rounded-xl bg-zinc-50/50 border border-zinc-200 space-y-3.5">
                            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200/60">
                              <Landmark size={15} className="text-zinc-800" />
                              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">1. Bank Account Details</span>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-zinc-700">Account Holder / Legal Business Name</label>
                              <input 
                                type="text" 
                                value={accountFormData.accountHolderName} 
                                placeholder="e.g. Iron Pulse Fitness LLP"
                                onChange={(e) => setAccountFormData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                                className={`w-full h-10 px-3 bg-white border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-zinc-900 focus:border-transparent ${
                                  accountFormErrors.accountHolderName ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                }`}
                              />
                              {accountFormErrors.accountHolderName && (
                                <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.accountHolderName}</span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-zinc-700">Bank Name</label>
                                <CustomDropdown
                                  id="combined-bank-dropdown"
                                  icon={Landmark}
                                  searchable={true}
                                  value={accountFormData.bankName}
                                  options={BANK_OPTIONS}
                                  onChange={(val) => setAccountFormData(prev => ({ ...prev, bankName: val }))}
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-zinc-700">Account Type</label>
                                <CustomDropdown
                                  id="combined-type-dropdown"
                                  icon={CreditCard}
                                  value={accountFormData.accountType}
                                  options={ACCOUNT_TYPE_OPTIONS}
                                  onChange={(val) => setAccountFormData(prev => ({ ...prev, accountType: val }))}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-zinc-700">Account Number</label>
                                <input 
                                  type="text" 
                                  value={accountFormData.accountNumber} 
                                  placeholder="e.g. 50200084920193"
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, accountNumber: e.target.value.replace(/\s+/g, '') }))}
                                  className={`w-full h-10 px-3 bg-white border rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-zinc-900 focus:border-transparent ${
                                    accountFormErrors.accountNumber ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                  }`}
                                />
                                {accountFormErrors.accountNumber && (
                                  <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.accountNumber}</span>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-zinc-700">Re-enter Account Number</label>
                                <input 
                                  type="text" 
                                  value={accountFormData.confirmAccountNumber} 
                                  placeholder="Re-type account number"
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, confirmAccountNumber: e.target.value.replace(/\s+/g, '') }))}
                                  className={`w-full h-10 px-3 bg-white border rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-zinc-900 focus:border-transparent ${
                                    accountFormErrors.confirmAccountNumber ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                  }`}
                                />
                                {accountFormErrors.confirmAccountNumber && (
                                  <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.confirmAccountNumber}</span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-zinc-700">IFSC Code</label>
                                <input 
                                  type="text" 
                                  maxLength={11}
                                  value={accountFormData.ifscCode} 
                                  placeholder="e.g. HDFC0000240"
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                                  className={`w-full h-10 px-3 bg-white border rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-zinc-900 focus:border-transparent uppercase ${
                                    accountFormErrors.ifscCode ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                  }`}
                                />
                                {accountFormErrors.ifscCode && (
                                  <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.ifscCode}</span>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-zinc-700">Branch Name (Optional)</label>
                                <input 
                                  type="text" 
                                  value={accountFormData.branchName} 
                                  placeholder="e.g. Indiranagar Branch"
                                  onChange={(e) => setAccountFormData(prev => ({ ...prev, branchName: e.target.value }))}
                                  className="w-full h-10 px-3 bg-white border border-zinc-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Section B: UPI VPA */}
                          <div className="p-4 rounded-xl bg-zinc-50/50 border border-zinc-200 space-y-3.5">
                            <div className="flex items-center gap-2 pb-2 border-b border-zinc-200/60">
                              <QrCode size={15} className="text-zinc-800" />
                              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">2. Merchant UPI VPA</span>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold text-zinc-700">Primary UPI ID / VPA Handle</label>
                              <input 
                                type="text" 
                                value={accountFormData.upiId} 
                                placeholder="e.g. ironpulse@okhdfcbank"
                                onChange={(e) => setAccountFormData(prev => ({ ...prev, upiId: e.target.value.toLowerCase().trim() }))}
                                className={`w-full h-10 px-3 bg-white border rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-zinc-900 focus:border-transparent ${
                                  accountFormErrors.upiId ? "border-red-400 bg-red-50/20" : "border-zinc-200"
                                }`}
                              />
                              {accountFormErrors.upiId && (
                                <span className="text-[10px] text-red-600 font-medium block">{accountFormErrors.upiId}</span>
                              )}
                            </div>

                            {accountFormData.upiId && accountFormData.upiId.includes("@") && (
                              <div className="p-3 bg-white rounded-lg border border-zinc-200 flex items-center gap-3">
                                <div className="p-1 border border-zinc-200 rounded shrink-0">
                                  <UpiQrCodeSvg vpa={accountFormData.upiId} name={accountFormData.accountHolderName || gymData.name} size={60} />
                                </div>
                                <div className="text-left min-w-0">
                                  <span className="text-[10px] font-bold text-zinc-900 block truncate">Vector Standee QR Linked</span>
                                  <span className="text-[10px] text-zinc-500 font-mono block truncate">{accountFormData.upiId}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* --- CASE D: CARD GATEWAY --- */}
                      {accountFormData.method === "CARD_GATEWAY" && (
                        <div className="space-y-4">
                          <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                                  <CreditCard size={18} />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-zinc-900">Card Payment Gateway Connector</h5>
                                  <span className="text-[10px] text-zinc-500 font-mono">Provider-Hosted Architecture</span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                COMING SOON / PARTNER ROLLOUT
                              </span>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-zinc-200 text-xs">
                              <label className="text-[11px] font-semibold text-zinc-700 block">Select Gateway Aggregator</label>
                              <div className="grid grid-cols-2 gap-3">
                                {["Razorpay", "Cashfree Payments"].map((p) => (
                                  <div 
                                    key={p}
                                    onClick={() => setAccountFormData(prev => ({ ...prev, gatewayProvider: p }))}
                                    className={`p-3 rounded-xl border text-center font-semibold text-xs cursor-pointer transition-all ${
                                      accountFormData.gatewayProvider === p
                                        ? "border-zinc-900 bg-white shadow-2xs font-bold text-zinc-900 ring-1 ring-zinc-900"
                                        : "border-zinc-200 bg-zinc-100/50 text-zinc-600 hover:bg-white"
                                    }`}
                                  >
                                    {p}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Strict Non-Custodial Security Policy Notice */}
                            <div className="p-3.5 rounded-xl bg-white border border-zinc-200/80 space-y-2">
                              <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs">
                                <ShieldCheck size={14} className="text-emerald-700" />
                                <span>Zero-Custody Card Acceptance Doctrine</span>
                              </div>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">
                                GymDeck strictly never asks for, touches, or stores credit/debit card numbers, CVVs, expiry dates, or PINs. All card payments are conducted directly through RBI-licensed aggregators via secure hosted checkouts.
                              </p>
                              <div className="text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-100">
                                Current Gateway Status: <strong className="text-zinc-700">NOT CONNECTED (Provider integration pending live deployment)</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 4: REVIEW & CONFIRM */}
                  {modalStep === 4 && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider font-mono">
                          Review Destination & Confirm
                        </h4>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Please verify your financial routing coordinates before connecting.
                        </p>
                      </div>

                      {/* Summary Card */}
                      <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200/80">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block font-medium">Beneficiary Name</span>
                            <div className="text-sm font-bold text-zinc-900">{accountFormData.accountHolderName}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-900 text-white">
                              {accountFormData.purpose === "inflow" ? "MEMBER INFLOW" : accountFormData.purpose === "outflow" ? "PAYROLL OUTFLOW" : "DUAL PURPOSE"}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white text-zinc-800 border border-zinc-200">
                              {accountFormData.method === "UPI" ? "UPI ONLY" : accountFormData.method === "BANK_TRANSFER" ? "BANK ONLY" : accountFormData.method === "COMBINED" ? "COMBINED" : "CARD GATEWAY"}
                            </span>
                          </div>
                        </div>

                        {/* Coordinates Review */}
                        <div className="space-y-3 text-xs">
                          {(accountFormData.method === "BANK_TRANSFER" || accountFormData.method === "COMBINED") && (
                            <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded-xl border border-zinc-200">
                              <div>
                                <span className="text-[10px] text-zinc-400 font-mono uppercase block">Bank & Account</span>
                                <span className="font-bold text-zinc-900 font-mono">
                                  {accountFormData.bankName} (•••• {accountFormData.accountNumber?.slice(-4) || "0000"})
                                </span>
                                <span className="text-[10px] text-zinc-500 block">{accountFormData.accountType}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-400 font-mono uppercase block">IFSC Code</span>
                                <span className="font-bold text-zinc-900 font-mono">{accountFormData.ifscCode}</span>
                                <span className="text-[10px] text-zinc-500 block truncate">{accountFormData.branchName || "Main Branch"}</span>
                              </div>
                            </div>
                          )}

                          {(accountFormData.method === "UPI" || accountFormData.method === "COMBINED") && (
                            <div className="p-3 bg-white rounded-xl border border-zinc-200 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <span className="text-[10px] text-zinc-400 font-mono uppercase block">Merchant UPI VPA</span>
                                <span className="font-bold text-zinc-900 font-mono truncate block">{accountFormData.upiId}</span>
                              </div>
                              {accountFormData.upiId && accountFormData.upiId.includes("@") && (
                                <div className="p-1 bg-zinc-50 rounded border border-zinc-200 shrink-0">
                                  <UpiQrCodeSvg vpa={accountFormData.upiId} name={accountFormData.accountHolderName} size={48} />
                                </div>
                              )}
                            </div>
                          )}

                          {accountFormData.method === "CARD_GATEWAY" && (
                            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-[11px] text-zinc-600">
                              Selected Gateway: <strong>{accountFormData.gatewayProvider}</strong> (Status: NOT_CONNECTED / COMING_SOON)
                            </div>
                          )}
                        </div>

                        {/* Statutory UNVERIFIED Disclaimer */}
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5">
                          <AlertCircle size={15} className="text-amber-800 shrink-0 mt-0.5" />
                          <div className="text-[11px] text-amber-900 leading-relaxed">
                            <strong>Status: UNVERIFIED.</strong> In compliance with financial security standards, newly configured destinations remain in <code className="font-mono font-bold">UNVERIFIED</code> status until matching transaction verification or staff approval is performed. You can immediately begin using this destination.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions with Dynamic Stepper Navigation */}
                <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between gap-2.5">
                  <div>
                    {modalStep > 1 && (
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="h-9 px-3.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <ChevronLeft size={14} strokeWidth={2} />
                        <span>Back</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAccountModalOpen(false)}
                      className="h-9 px-4 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    {modalStep < 4 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm border border-zinc-900"
                      >
                        <span>
                          {modalStep === 1 && "Next: Choose Method"}
                          {modalStep === 2 && "Next: Configure Details"}
                          {modalStep === 3 && "Review Destination"}
                        </span>
                        <ChevronRight size={14} strokeWidth={2} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveAccountForm}
                        className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm border border-zinc-900"
                      >
                        <Check size={14} strokeWidth={2} />
                        <span>{editingAccountId ? "Save Account Changes" : "Confirm & Connect Destination"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 8. DYNAMIC NPCI COUNTERTOP UPI QR MODAL */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isUpiQrModalOpen && selectedQrAccount && (
            <motion.div 
              key="upi-qr-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpiQrModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
              style={{ zIndex: 100000 }}
            >
              <motion.div 
                key="upi-qr-card"
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-sm w-full p-6 text-center relative overflow-hidden select-none"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsUpiQrModalOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors cursor-pointer border-0"
                >
                  <X size={15} strokeWidth={2} />
                </button>

                {/* Header Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold mb-3">
                  <ShieldCheck size={12} strokeWidth={2} />
                  <span>Direct Merchant UPI Rail</span>
                </div>

                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  {gymData.name || selectedQrAccount.accountHolderName || "Official Facility Account"}
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Scan with any UPI app to pay membership fees & subscriptions
                </p>

                {/* QR Code Graphic */}
                <div className="my-5 flex justify-center">
                  <UpiQrCodeSvg 
                    vpa={selectedQrAccount.upiId} 
                    name={selectedQrAccount.accountHolderName || gymData.name} 
                    size={210} 
                  />
                </div>

                {/* VPA Display Box */}
                <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between mb-4">
                  <div className="text-left min-w-0 pr-2">
                    <span className="text-[9px] text-zinc-400 block font-medium uppercase">Direct VPA</span>
                    <span className="text-xs font-mono font-bold text-zinc-900 truncate block">
                      {selectedQrAccount.upiId || ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedQrAccount.upiId, "upi", "modal")}
                    className="h-7 px-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    {copiedUpiId === "modal" ? (
                      <Check size={12} strokeWidth={2.5} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} strokeWidth={2} />
                    )}
                    <span>{copiedUpiId === "modal" ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                {/* Supported Payment Rails */}
                <div className="text-[10px] text-zinc-400 font-medium mb-4 flex items-center justify-center gap-2">
                  <span>Google Pay</span>
                  <span>•</span>
                  <span>PhonePe</span>
                  <span>•</span>
                  <span>Paytm</span>
                  <span>•</span>
                  <span>BHIM</span>
                  <span>•</span>
                  <span>Cred</span>
                </div>

                {/* Download / Close Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedQrAccount?.upiId) return;
                      try {
                        const payeeName = encodeURIComponent((selectedQrAccount.accountHolderName || gymData.name || "Merchant").trim());
                        const uri = `upi://pay?pa=${selectedQrAccount.upiId.trim()}&pn=${payeeName}&cu=INR`;
                        const qr = qrcode(0, "M");
                        qr.addData(uri);
                        qr.make();
                        const svgTag = qr.createSvgTag({ cellSize: 8, margin: 4, scalable: true });
                        const blob = new Blob([svgTag], { type: "image/svg+xml;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `GymDeck-Standee-${selectedQrAccount.upiId}.svg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showToast("Countertop Standee QR SVG downloaded.");
                      } catch (e) {
                        showToast("Failed to download Standee QR.");
                      }
                    }}
                    className="flex-1 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-zinc-900 shadow-sm"
                  >
                    <Download size={13} strokeWidth={2} />
                    <span>Download Standee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUpiQrModalOpen(false)}
                    className="h-9 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer border border-zinc-200"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 8.5 CARD GATEWAY PROVIDER ONBOARDING MODAL (COMING SOON) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isCardGatewayModalOpen && (
            <motion.div 
              key="gateway-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCardGatewayModalOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
              style={{ zIndex: 100000 }}
            >
              <motion.div 
                key="gateway-modal-card"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full p-6 text-left select-none relative space-y-5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                      <CreditCard size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Card Payments Gateway Integration</h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold font-mono">
                          COMING SOON · NOT CONNECTED
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Debit and credit card payments are currently disabled until an authorized Payment Aggregator is connected.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCardGatewayModalOpen(false)}
                    className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Gateway Principles List */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="text-zinc-700" />
                      <span className="text-xs font-bold text-zinc-900">Direct Merchant Settlement (MID)</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      GymDeck connects directly to your own merchant account with RBI-licensed Payment Aggregators (Razorpay, Pine Labs, Cashfree). All card sales settle on T+1 rails directly into your primary receiving bank account.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={13} className="text-emerald-700" />
                      <span className="text-xs font-bold text-zinc-900">Zero Intermediary Escrow or Wallet Holding</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      GymDeck never touches, pools, or delays your funds. Customer card charges go straight from the card network through the licensed aggregator into your commercial account.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                    <div className="flex items-center gap-2">
                      <Lock size={13} className="text-purple-700" />
                      <span className="text-xs font-bold text-zinc-900">PCI-DSS Level 1 & RBI Card Tokenization</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed">
                      Full compliance with RBI card-on-file (COF) tokenization guidelines. Credit and debit card credentials, CVVs, and expiry dates are never stored, transmitted, or accessible on GymDeck infrastructure.
                    </p>
                  </div>
                </div>

                {/* Pilot Notification Note */}
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-900">
                  <Info size={14} className="shrink-0 text-amber-700 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Self-Serve Provider Key Onboarding</span>
                    <span className="text-[11px] text-amber-800 leading-relaxed block mt-0.5">
                      Direct self-serve API key and POS terminal pairing (Razorpay POS / Pine Labs Plutus) is launching in the next release. Your gym is queued for instant activation.
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsCardGatewayModalOpen(false)}
                    className="h-9 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                  >
                    Understood & Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 9. DISCONNECT CONFIRMATION MODAL */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {accountToDelete && (
            <motion.div 
              key="delete-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAccountToDelete(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              style={{ zIndex: 100000 }}
            >
              <motion.div 
                key="delete-modal-card"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-sm w-full p-6 text-center select-none"
              >
                <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-200/60">
                  <AlertTriangle size={20} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Disconnect Financial Account?</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Are you sure you want to disconnect <span className="font-semibold text-zinc-800">{accountToDelete.bankName}</span> (•••• {accountToDelete.accountNumber?.slice(-4) || "0000"})? Active member fee settlements and trainer payroll will be re-routed.
                </p>
                <div className="flex items-center gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setAccountToDelete(null)}
                    className="flex-1 h-9 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(accountToDelete.id)}
                    className="flex-1 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm border border-red-600"
                  >
                    Disconnect
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

// ─────────────────────────────────────────
// MOUNT UTILITY
// ─────────────────────────────────────────
export function mountGymProfile(container) {
  const target = container || document.querySelector('[data-stage="gym-profile"]');
  if (!target) return null;
  const root = createRoot(target);
  root.render(<GymProfile />);
  return root;
}

export default GymProfile;
