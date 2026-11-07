import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import BrandFooter from "./BrandFooter.jsx";
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
  MoreHorizontal, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  HelpCircle, 
  Activity, 
  Smartphone, 
  FileText,
  BadgeCheck,
  CheckCircle2,
  AlertTriangle,
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
  Send
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
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl shadow-zinc-900/10 overflow-hidden py-1.5 max-h-60 overflow-y-auto"
            style={{ minWidth: "220px" }}
            role="listbox"
          >
            {options.map((opt, idx) => {
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
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

  // Listen for Escape key to close QR pass modal & lock background scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsQrModalOpen(false);
      }
    };
    if (isQrModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isQrModalOpen]);

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

    // Digital & Apps
    iosAppUrl: "",
    androidAppUrl: "",
    subdomain: "",
    customDomain: "",
    qrCheckinEnabled: true,

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


  // Focused List of Tabs in the Horizontal Navigation Row
  const tabs = useMemo(() => [
    { id: "General", label: "General", icon: Building2 },
    { id: "Contact & Communication", label: "Contact & Communication", icon: MessageSquare },
    { id: "Branches", label: "Branches", icon: MapPin },
    { id: "Operational Settings", label: "Operational Settings", icon: Clock },
    { id: "Digital & Apps", label: "Digital & Apps", icon: Smartphone },
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
    const matched = tabs.find(t => t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
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

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
      showToast("Settings saved successfully.");
    }, 800);
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

      {/* 3. MAIN WORKSPACE (8-column workspace + 4-column live preview) */}
      <div className="max-w-[1600px] mx-auto px-8 grid grid-cols-12 gap-8 items-start">
        
        {/* 3A. MAIN CONFIGURATION WORKSPACE (Spans 8 columns on large screens) */}
        <main className="col-span-12 lg:col-span-7 xl:col-span-8 space-y-8">
          
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

            {/* ──────── TAB 5: OPERATIONAL SETTINGS ──────── */}
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

            {/* ──────── TAB 6: DIGITAL & APPS ──────── */}
            {activeTab === "Digital & Apps" && (
              <motion.div 
                key="tab-digital"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                <section className="bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm">
                  <div className="flex items-center gap-3.5 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-800">
                      <Smartphone size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-900 tracking-tight">Member Mobile Apps & QR Codes</h2>
                      <p className="text-xs text-zinc-500 font-normal">Download endpoints, custom portal domain, and touchless check-in</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">iOS App Store URL</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Apple size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" 
                          value={gymData.iosAppUrl} 
                          placeholder="e.g. https://apps.apple.com/app/your-gym/id123456789"
                          onChange={(e) => handleInputChange('iosAppUrl', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Google Play Store URL</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Play size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" 
                          value={gymData.androidAppUrl} 
                          placeholder="e.g. https://play.google.com/store/apps/details?id=com.yourgym.app"
                          onChange={(e) => handleInputChange('androidAppUrl', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">GymDeck Subdomain</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Globe size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" 
                          value={gymData.subdomain} 
                          placeholder="e.g. yourgym.gymdeck.app (Free GymDeck web portal link)"
                          onChange={(e) => handleInputChange('subdomain', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal placeholder:font-sans" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-600">Custom Domain</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                          <Link2 size={15} strokeWidth={1.5} />
                        </div>
                        <input 
                          type="text" 
                          value={gymData.customDomain} 
                          placeholder="e.g. members.yourgym.com (Custom branded domain)"
                          onChange={(e) => handleInputChange('customDomain', e.target.value)}
                          className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-semibold focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all placeholder:text-zinc-400 placeholder:font-normal placeholder:font-sans" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-white rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-800">
                        <QrCode size={20} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-900">Touchless Member QR Check-in</h4>
                        <p className="text-[11px] text-zinc-500">Allow members to scan and log entry from mobile application</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={gymData.qrCheckinEnabled} 
                      onChange={(e) => handleInputChange('qrCheckinEnabled', e.target.checked)}
                      className="w-4 h-4 rounded text-zinc-900 focus:ring-0 cursor-pointer" 
                    />
                  </div>
                </section>
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

        {/* 3B. RIGHT SIDE WIDGET PANEL (Spans 4 columns on large screens) */}
        <aside id="sidebar-widget-panel" className="col-span-12 lg:col-span-5 xl:col-span-4 sticky top-24 space-y-6">

          {/* COMPACT DARK TOUCHLESS QR PASS CARD */}
          <section 
            className="text-white rounded-2xl p-4 sm:p-5 border relative overflow-hidden shadow-xl"
            style={{
              background: '#090d16',
              borderColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '20px',
              color: '#ffffff'
            }}
          >
            {/* Ambient Glow Graphic Elements */}
            <div 
              className="absolute top-0 right-0 w-56 h-56 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none" 
              style={{ background: 'rgba(99, 102, 241, 0.09)' }}
            />
            <div 
              className="absolute bottom-0 left-0 w-44 h-44 rounded-full blur-[70px] -ml-16 -mb-16 pointer-events-none" 
              style={{ background: 'rgba(16, 185, 129, 0.04)' }}
            />

            <div className="relative z-10 flex flex-col gap-3">
              
              {/* Header Badge & Security Indicator */}
              <div className="flex items-center justify-between">
                <div 
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                  style={{
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#818cf8'
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Public Profile QR
                </div>

                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  <Shield size={10} className="text-slate-500" />
                  <span>Encrypted</span>
                </div>
              </div>

              {/* Main Side-by-Side Content: QR on Left, Details & Actions on Right */}
              <div className="flex items-start gap-3.5">
                
                {/* Left Column: QR Code Container (Clickable -> Opens Member-Directory-Style Profile Card) */}
                <div 
                  onClick={() => setIsQrModalOpen(true)}
                  className="shrink-0 flex flex-col items-center cursor-pointer group/qr transition-all active:scale-95"
                  title="Click to preview luxury profile pass"
                >
                  <div className="p-2 bg-white rounded-xl shadow-md border border-zinc-200 group-hover/qr:border-blue-400 group-hover/qr:shadow-blue-500/25 group-hover/qr:shadow-lg transition-all relative overflow-hidden">
                    <QrCode size={78} strokeWidth={1.75} className="text-zinc-900 group-hover/qr:scale-[0.98] transition-transform" />
                    <div className="absolute inset-0 bg-blue-600/10 rounded-xl opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <Eye size={12} strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-1.5 font-medium tracking-tight truncate max-w-[88px] text-center block group-hover/qr:text-blue-400 transition-colors">
                    {gymData.subdomain ? gymData.subdomain : "yourgym.app"}
                  </span>
                </div>

                {/* Right Column: Title, Description, and Action Buttons */}
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                  <div>
                    <h3 
                      onClick={() => setIsQrModalOpen(true)}
                      className="text-xs font-bold text-white tracking-tight leading-snug cursor-pointer hover:text-blue-400 transition-colors"
                    >
                      Touchless Reception Pass
                    </h3>
                    <p className="text-[10px] text-slate-400 font-normal leading-relaxed mt-0.5">
                      Front-desk kiosk & member web check-in.
                    </p>
                  </div>

                  {/* Actions Row / Stack */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <button 
                      onClick={handleDownloadPass}
                      className="w-full h-7 px-2.5 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer"
                      style={{ 
                        background: '#1b64f2',
                        color: '#ffffff',
                        border: 'none'
                      }}
                    >
                      <Download size={11} strokeWidth={2} />
                      <span>Download QR</span>
                    </button>

                    <button 
                      onClick={() => {
                        const url = gymData.subdomain ? `https://${gymData.subdomain}` : "https://yourgym.gymdeck.app";
                        navigator.clipboard?.writeText(url);
                        showToast("Public profile link copied to clipboard.");
                      }}
                      className="w-full h-7 px-2.5 text-slate-300 hover:text-white text-[9px] font-semibold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05]"
                    >
                      <ExternalLink size={10} strokeWidth={1.75} />
                      <span>Copy Portal URL</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </section>



        </aside>
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
