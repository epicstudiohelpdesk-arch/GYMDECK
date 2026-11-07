import React, { useState, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import BrandFooter from "./BrandFooter.jsx";
import { 
  Settings, 
  Search, 
  Save, 
  RotateCcw, 
  FileText, 
  Activity, 
  ChevronRight, 
  ChevronDown,
  MapPin,
  Layout, 
  Bell, 
  Zap, 
  Shield, 
  Cpu, 
  Database, 
  HardDrive, 
  Code, 
  Smartphone, 
  MessageSquare, 
  Mail, 
  CreditCard, 
  Fingerprint, 
  QrCode, 
  RefreshCw, 
  Globe, 
  Clock, 
  Sun, 
  Moon, 
  Monitor, 
  Maximize, 
  Minimize, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  ArrowRight,
  UserCheck,
  Lock,
  Wifi,
  Terminal,
  Download,
  Upload,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Users,
  Calendar,
  FileCheck,
  Layers,
  Check,
  Trash2,
  FolderArchive,
  Sliders,
  Search as SearchIcon,
  X
} from "lucide-react";

/**
 * REUSABLE CUSTOM SELECT COMPONENT
 * Professional custom dropdown with animated popover and outside-click dismissal
 */
const CustomSelect = ({ 
  label, 
  value, 
  options, 
  onChange, 
  icon: Icon, 
  description,
  disabled = false,
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const currentOption = useMemo(() => {
    return options.find(o => {
      const val = typeof o === "object" ? o.value : o;
      return val === value;
    }) || options[0];
  }, [options, value]);

  const displayLabel = typeof currentOption === "object" ? currentOption.label : currentOption;

  return (
    <div className={`space-y-1.5 ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-0.5">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-11 px-3.5 bg-white hover:bg-zinc-50/80 border rounded-xl text-xs font-semibold text-zinc-900 flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-2xs ${
            isOpen 
              ? "border-zinc-900 ring-2 ring-zinc-900/10" 
              : "border-zinc-200 hover:border-zinc-300"
          } ${disabled ? "opacity-60 cursor-not-allowed bg-zinc-50" : ""}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && <Icon size={14} className="text-zinc-400 shrink-0" />}
            <span className="truncate">{displayLabel}</span>
          </div>
          <ChevronDown 
            size={14} 
            className={`text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-zinc-900" : ""}`} 
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="absolute z-50 left-0 right-0 mt-1.5 py-1.5 bg-white rounded-xl border border-zinc-200 shadow-xl max-h-56 overflow-y-auto no-scrollbar"
            >
              {options.map((opt) => {
                const optVal = typeof opt === "object" ? opt.value : opt;
                const optLabel = typeof opt === "object" ? opt.label : opt;
                const isSelected = optVal === value;
                return (
                  <button
                    key={optVal}
                    type="button"
                    onClick={() => {
                      onChange(optVal);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected 
                        ? "bg-zinc-100 text-zinc-950 font-semibold" 
                        : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 font-medium"
                    }`}
                  >
                    <span className="truncate">{optLabel}</span>
                    {isSelected && <Check size={14} className="text-zinc-900 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {description && (
        <p className="text-[11px] text-zinc-400 font-normal ml-0.5">{description}</p>
      )}
    </div>
  );
};

/**
 * REUSABLE TOGGLE SWITCH COMPONENT
 */
const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out relative shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900/10 ${
      checked ? "bg-zinc-900" : "bg-zinc-200"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <span
      className={`pointer-events-none inline-block w-4.5 h-4.5 rounded-full bg-white shadow-sm transform transition duration-200 ease-in-out absolute top-[3px] ${
        checked ? "translate-x-5.5" : "translate-x-1"
      }`}
    />
  </button>
);

/**
 * GYMDECK • APP SETTINGS & SYSTEM CONFIGURATION
 * Enterprise Production-Grade Platform Infrastructure
 */

const AppSettings = () => {
  const [activeTab, setActiveTab] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchInputRef = useRef(null);

  // Keyboard shortcut: Cmd+K or Ctrl+K to focus search, Esc to blur
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- MOCK SETTINGS STATE ---
  const [settings, setSettings] = useState({
    general: {
      language: "English",
      region: "India",
      timezone: "Asia/Kolkata (GMT+05:30)",
      currency: "INR (₹)",
      dateFormat: "DD/MM/YYYY",
      firstDayOfWeek: "Monday"
    },
    appearance: {
      theme: "system",
      density: "comfortable",
      sidebarMode: "hover-expand",
      typography: "standard",
      animations: "cinematic"
    },
    notifications: {
      push: true,
      whatsapp: true,
      sms: false,
      email: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "06:00"
    },
    automation: {
      renewalReminders: true,
      autoFreeze: false,
      ptBillingTriggers: true,
      leadFollowups: true,
      attendanceAutoCheckin: true,
      attendanceGraceMinutes: "30",
      billingInvoiceAutopilot: true,
      billingRetryFailed: true
    },
    security: {
      twoFactor: false,
      sessionTimeout: "30",
      deviceControl: true,
      ipRestriction: false,
      rolePermissions: "manager-restricted",
      accessLogsRetention: "90"
    },
    performance: {
      cacheManagement: "aggressive",
      syncFrequency: "real-time",
      imageOptimization: true,
      workerThreads: "4",
      backgroundQueue: true
    },
    backup: {
      localAutoBackup: true,
      localBackupFormat: "sqlite",
      cloudSyncSchedule: "daily",
      exportFormat: "json"
    }
  });

  const tabs = useMemo(() => [
    { id: "General", label: "General", icon: Globe },
    { id: "Appearance", label: "Appearance", icon: Layout },
    { id: "Notifications", label: "Notifications", icon: Bell },
    { id: "Automation", label: "Automation", icon: Zap },
    { id: "Security", label: "Security", icon: Shield }
  ], []);

  // --- CUSTOM SELECT OPTIONS ---
  const languageOptions = useMemo(() => [
    { value: "English", label: "English (US & Global)" },
    { value: "Hindi", label: "Hindi (हिन्दी)" },
    { value: "Bengali", label: "Bengali (বাংলা)" },
    { value: "Spanish", label: "Spanish (Español)" },
    { value: "French", label: "French (Français)" }
  ], []);

  const regionOptions = useMemo(() => [
    { value: "India", label: "India (IN • GST / PAN / ₹)" },
    { value: "United States", label: "United States (US • EIN / $)" },
    { value: "United Kingdom", label: "United Kingdom (UK • VAT / £)" },
    { value: "United Arab Emirates", label: "United Arab Emirates (UAE • TRN / د.إ)" },
    { value: "Canada", label: "Canada (CA • HST / $)" },
    { value: "Australia", label: "Australia (AU • ABN / $)" },
    { value: "Singapore", label: "Singapore (SG • UEN / $)" }
  ], []);

  const timezoneOptions = useMemo(() => [
    { value: "Asia/Kolkata (GMT+05:30)", label: "Asia/Kolkata (GMT+05:30) • IST" },
    { value: "UTC (GMT+00:00)", label: "UTC (GMT+00:00) • Coordinated Universal" },
    { value: "America/New_York (GMT-05:00)", label: "America/New York (GMT-05:00) • EST" },
    { value: "Europe/London (GMT+00:00)", label: "Europe/London (GMT+00:00) • GMT/BST" },
    { value: "Asia/Dubai (GMT+04:00)", label: "Asia/Dubai (GMT+04:00) • GST" }
  ], []);

  const currencyOptions = useMemo(() => [
    { value: "INR (₹)", label: "INR (₹) • Indian Rupee" },
    { value: "USD ($)", label: "USD ($) • US Dollar" },
    { value: "EUR (€)", label: "EUR (€) • Euro" },
    { value: "GBP (£)", label: "GBP (£) • British Pound" },
    { value: "AED (د.إ)", label: "AED (د.إ) • UAE Dirham" }
  ], []);

  const dateFormatOptions = useMemo(() => [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 25/12/2026)" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 12/25/2026)" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO 8601 standard)" },
    { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY (e.g. 25-Dec-2026)" }
  ], []);

  const firstDayOfWeekOptions = useMemo(() => [
    { value: "Monday", label: "Monday (ISO 8601 Standard)" },
    { value: "Sunday", label: "Sunday (Traditional)" }
  ], []);

  const typographyOptions = useMemo(() => [
    { value: "standard", label: "Inter Standard (14px) • Optimal balance" },
    { value: "compact", label: "Compact Dense (13px) • High data throughput" },
    { value: "large", label: "Large Legibility (15px) • Enhanced visibility" }
  ], []);

  const sidebarOptions = useMemo(() => [
    { value: "hover-expand", label: "Hover Expand • Dynamic auto flyout" },
    { value: "always-expanded", label: "Expanded Fixed • 240px persistent width" },
    { value: "compact", label: "Icon Rail • Minimalist icon navigation" }
  ], []);

  const graceWindowOptions = useMemo(() => [
    { value: "15", label: "15 Minutes (Strict Tolerance)" },
    { value: "30", label: "30 Minutes (Recommended)" },
    { value: "60", label: "60 Minutes (Flexible Window)" },
    { value: "all-day", label: "Unrestricted (Full Day Access)" }
  ], []);

  const retentionOptions = useMemo(() => [
    { value: "30", label: "30 Days (Compliance Baseline)" },
    { value: "90", label: "90 Days (Recommended Tier)" },
    { value: "180", label: "180 Days (Extended Regulatory)" },
    { value: "365", label: "365 Days (Full Fiscal Year)" }
  ], []);

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
    }, 1500);
  };

  return (
    <div className="app-settings-workspace bg-[#F8FAFC] min-h-full font-['Plus_Jakarta_Sans'] text-[#111827] pb-24">
      
      {/* 5. TOP UTILITY HEADER */}
      <header className="sticky top-0 z-[100] h-16 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-xs font-semibold tracking-wide text-zinc-400">
            <span className="hover:text-zinc-600 transition-colors">Settings</span>
            <ChevronRight size={13} className="mx-2 text-zinc-300" />
            <span className="text-zinc-900 font-bold">App Settings</span>
          </nav>
        </div>

        {/* Central Search Bar - Consistent with Gym Profile */}
        <div className="flex-1 max-w-md mx-8">
          <div 
            className={`relative flex items-center w-full h-9 rounded-xl transition-all duration-150 ${
              isSearchFocused 
                ? 'bg-white border-2 border-zinc-900 shadow-sm' 
                : 'bg-zinc-100/90 hover:bg-zinc-200/60 border border-zinc-200/90 shadow-2xs'
            }`}
          >
            <div className={`pointer-events-none absolute left-3 flex items-center justify-center transition-colors ${
              isSearchFocused ? 'text-zinc-900' : 'text-zinc-400'
            }`}>
              <SearchIcon size={14} strokeWidth={isSearchFocused ? 2 : 1.75} />
            </div>
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search settings, permissions, automations..."
              style={{ border: "none", outline: "none", boxShadow: "none" }}
              className="w-full h-full pl-9 pr-14 bg-transparent text-xs font-medium text-zinc-900 placeholder:text-zinc-400 border-none outline-none focus:outline-none focus:ring-0 shadow-none"
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 p-1 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/70 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={13} strokeWidth={2} />
              </button>
            ) : (
              <div className="pointer-events-none absolute right-2.5 flex items-center">
                <kbd className="inline-flex items-center justify-center h-4.5 px-1.5 text-[10px] font-semibold text-zinc-400 bg-white border border-zinc-200 rounded shadow-2xs font-mono select-none">
                  ⌘K
                </kbd>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`h-9 px-4 rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer
              ${hasChanges ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'}`}
          >
            {isSaving ? <Activity size={14} strokeWidth={1.5} className="animate-spin text-white" /> : <Save size={14} strokeWidth={1.5} />}
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </header>

      {/* 6. REFINED ARCHITECTURAL BANNER & PLATFORM CARD */}
      <div className="max-w-[1600px] mx-auto px-8 pt-6">
        <div className="relative h-[250px] sm:h-[280px] lg:h-[300px] w-full rounded-2xl border border-zinc-800 shadow-sm overflow-hidden mb-5 bg-zinc-950 group">
          
          {/* Background Image with Dark Atmospheric Blend */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity scale-105 transition-transform duration-700 ease-out group-hover:scale-100"
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80')` 
            }}
          />
          
          {/* Dark Vignettes & Moody Gradient Blends */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-950/50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-transparent to-transparent pointer-events-none" />

          {/* Thin Architectural Faded Grid Overlay */}
          <div 
            className="absolute inset-0 pointer-events-none z-[5]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255, 255, 255, 0.16) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.16) 1px, transparent 1px)
              `,
              backgroundSize: '36px 36px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.9) 25%, transparent 85%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.9) 25%, transparent 85%)'
            }}
          />

          {/* Left-Aligned Platform Control Telemetry & Overview */}
          <div className="w-full h-full flex flex-col justify-center px-8 sm:px-12 select-none relative z-10">
            
            {/* Line 1: Title & Badge Container */}
            <div className="flex flex-wrap items-center gap-3 max-w-full">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Platform Control Center
              </h1>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-zinc-200 border border-white/15 text-[11px] font-semibold tracking-wide flex-shrink-0 backdrop-blur-md">
                <ShieldCheck size={13} strokeWidth={1.75} className="text-zinc-200" />
                <span>Enterprise Infrastructure</span>
              </div>
            </div>

            {/* Line 2: Description */}
            <p className="text-xs sm:text-sm font-medium text-zinc-300 mt-2 max-w-[760px] leading-relaxed drop-shadow-sm">
              Configure platform behavior, automation workflows, notifications, security, and operational preferences across your entire GymDeck ecosystem.
            </p>

            {/* Line 3: Metadata Badges Container */}
            <div className="flex flex-wrap items-center gap-3.5 mt-5 text-xs font-medium text-zinc-400">
              <span className="inline-flex items-center gap-1.5 h-[24px]">
                <Wifi size={13} strokeWidth={1.5} className="text-zinc-400 flex-shrink-0" />
                <span className="text-white font-semibold">0.42ms</span>
                <span className="text-zinc-400">Sync Latency</span>
              </span>
              <span className="text-zinc-600 select-none">•</span>
              <span className="inline-flex items-center gap-1.5 h-[24px]">
                <Smartphone size={13} strokeWidth={1.5} className="text-zinc-400 flex-shrink-0" />
                <span className="text-white font-semibold">428</span>
                <span className="text-zinc-400">Active Nodes</span>
              </span>
              <span className="text-zinc-600 select-none">•</span>
              <span className="inline-flex items-center gap-1.5 h-[24px]">
                <Database size={13} strokeWidth={1.5} className="text-zinc-400 flex-shrink-0" />
                <span className="text-white font-semibold">SQLite Local</span>
                <span className="text-zinc-400">Engine</span>
              </span>
              <span className="text-zinc-600 select-none">•</span>
              <span className="inline-flex items-center gap-1.5 h-[24px]">
                <CheckCircle2 size={13} strokeWidth={1.75} className="text-emerald-400 flex-shrink-0" />
                <span className="text-emerald-400 font-semibold">Healthy & Operational</span>
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* 7. DEDICATED HORIZONTAL NAVIGATION TABS (OUTSIDE THE HERO CARD - IDENTICAL TO GYM PROFILE) */}
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
                    layoutId="activeSettingsTabPill"
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

      <div className="max-w-[1600px] mx-auto px-8">
        
        {/* MAIN CONFIGURATION WORKSPACE (Spans full width - sidebars removed for maximum clarity & workspace) */}
        <main className="w-full space-y-8">
          
          <AnimatePresence mode="wait">
            {activeTab === "General" && (
              <motion.div 
                key="general"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* 10. GENERAL SETTINGS / LOCALIZATION & REGIONAL */}
                <section className="bg-white rounded-2xl border border-zinc-200/90 p-7 sm:p-8 shadow-xs">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-900 shadow-2xs">
                        <Globe size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">Localization & Regional</h2>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">Configure language, timezone, currency, and date formatting defaults</p>
                      </div>
                    </div>
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold">
                      <CheckCircle2 size={13} strokeWidth={1.75} />
                      <span>Standard Compliant</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-zinc-100">
                    <CustomSelect 
                      label="App Language"
                      value={settings.general.language}
                      options={languageOptions}
                      onChange={(val) => handleInputChange('general', 'language', val)}
                      icon={Globe}
                      description="System-wide translations and labels"
                    />
                    <CustomSelect 
                      label="Operating Region & Country"
                      value={settings.general.region || "India"}
                      options={regionOptions}
                      onChange={(val) => handleInputChange('general', 'region', val)}
                      icon={MapPin}
                      description="Determines default tax and regulatory rules"
                    />
                    <CustomSelect 
                      label="Time Zone"
                      value={settings.general.timezone}
                      options={timezoneOptions}
                      onChange={(val) => handleInputChange('general', 'timezone', val)}
                      icon={Clock}
                      description="Used for session reminders and attendance stamps"
                    />
                    <CustomSelect 
                      label="Primary Currency"
                      value={settings.general.currency}
                      options={currencyOptions}
                      onChange={(val) => handleInputChange('general', 'currency', val)}
                      icon={CreditCard}
                      description="Default currency used across invoices and billing"
                    />
                    <CustomSelect 
                      label="Date Format"
                      value={settings.general.dateFormat}
                      options={dateFormatOptions}
                      onChange={(val) => handleInputChange('general', 'dateFormat', val)}
                      icon={Calendar}
                      description="Display format for receipts and reports"
                    />
                    <CustomSelect 
                      label="First Day of Week"
                      value={settings.general.firstDayOfWeek || "Monday"}
                      options={firstDayOfWeekOptions}
                      onChange={(val) => handleInputChange('general', 'firstDayOfWeek', val)}
                      icon={Calendar}
                      description="Calendar grid starts on this day"
                    />
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Appearance" && (
              <motion.div 
                key="appearance"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* 11. THEME & VISUAL EXPERIENCE */}
                <section className="bg-white rounded-2xl border border-zinc-200/90 p-7 sm:p-8 shadow-xs">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-900 shadow-2xs">
                        <Layout size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">Theme & Visual Experience</h2>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">Personalize the interface theme, density, typography, and motion dynamics</p>
                      </div>
                    </div>
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-semibold">
                      <Sparkles size={13} strokeWidth={1.75} />
                      <span>Real-Time Engine</span>
                    </div>
                  </div>

                  <div className="space-y-8 pt-6 border-t border-zinc-100">
                    {/* System Theme Selection */}
                    <div className="space-y-3">
                      <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-0.5">
                        Interface Theme
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { id: 'light', label: 'Light Mode', desc: 'Clean, high-contrast daylight palette', icon: Sun },
                          { id: 'dark', label: 'Dark Mode', desc: 'Low-light tactical midnight theme', icon: Moon },
                          { id: 'system', label: 'System Sync', desc: 'Follows operating system appearance', icon: Monitor }
                        ].map(theme => {
                          const isSel = settings.appearance.theme === theme.id;
                          return (
                            <button 
                              key={theme.id}
                              type="button"
                              onClick={() => handleInputChange('appearance', 'theme', theme.id)}
                              className={`flex flex-col items-start p-5 rounded-xl border text-left transition-all cursor-pointer relative ${
                                isSel 
                                  ? 'border-zinc-900 bg-zinc-50/70 ring-2 ring-zinc-900/10 shadow-xs' 
                                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                  isSel ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
                                }`}>
                                  <theme.icon size={18} strokeWidth={1.75} />
                                </div>
                                {isSel && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 text-white text-[10px] font-semibold">
                                    <Check size={11} strokeWidth={2.5} /> Active
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold text-zinc-900">{theme.label}</div>
                              <div className="text-[11px] text-zinc-500 mt-0.5">{theme.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* UI Density & Motion Dynamics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-0.5">
                          UI Density
                        </label>
                        <div className="flex p-1 bg-zinc-100 border border-zinc-200/60 rounded-xl gap-1">
                          {['Compact', 'Comfortable', 'Spacious'].map(d => {
                            const isSel = settings.appearance.density === d.toLowerCase();
                            return (
                              <button 
                                key={d}
                                type="button"
                                onClick={() => handleInputChange('appearance', 'density', d.toLowerCase())}
                                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  isSel ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80' : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-zinc-400 font-normal ml-0.5">Adjusts table row heights, card padding, and font scales</p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ml-0.5">
                          Motion Dynamics
                        </label>
                        <div className="flex p-1 bg-zinc-100 border border-zinc-200/60 rounded-xl gap-1">
                          {['Disabled', 'Standard', 'Cinematic'].map(a => {
                            const isSel = settings.appearance.animations === a.toLowerCase();
                            return (
                              <button 
                                key={a}
                                type="button"
                                onClick={() => handleInputChange('appearance', 'animations', a.toLowerCase())}
                                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  isSel ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80' : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                              >
                                {a}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-zinc-400 font-normal ml-0.5">Page transitions, drawer springs, and modal choreography</p>
                      </div>
                    </div>

                    {/* Typography Scale & Sidebar Navigation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                      <CustomSelect 
                        label="Typography Scale"
                        value={settings.appearance.typography}
                        options={typographyOptions}
                        onChange={(val) => handleInputChange('appearance', 'typography', val)}
                        icon={Sliders}
                        description="Global text sizing across analytics and dashboards"
                      />
                      <CustomSelect 
                        label="Navigation Sidebar Behavior"
                        value={settings.appearance.sidebarMode}
                        options={sidebarOptions}
                        onChange={(val) => handleInputChange('appearance', 'sidebarMode', val)}
                        icon={Layout}
                        description="Controls primary navigation collapse and expansion"
                      />
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Notifications" && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* 12. CHANNEL COMMUNICATION */}
                <section className="bg-white rounded-2xl border border-zinc-200/90 p-7 sm:p-8 shadow-xs">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-900 shadow-2xs">
                        <Bell size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">Channel Communication</h2>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">Manage broadcast channels, member alerts, and quiet hours delivery windows</p>
                      </div>
                    </div>
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold">
                      <CheckCircle2 size={13} strokeWidth={1.75} />
                      <span>Gateways Operational</span>
                    </div>
                  </div>

                  {/* 4 Communication Channels */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-zinc-100">
                    {[
                      { id: 'push', label: 'Push Notifications', desc: 'Mobile alerts & instant operational notices', icon: Smartphone, color: 'text-blue-600 bg-blue-50 border-blue-200/60' },
                      { id: 'whatsapp', label: 'WhatsApp Alerts', desc: 'Automated renewal links & payment receipts', icon: MessageSquare, color: 'text-emerald-600 bg-emerald-50 border-emerald-200/60' },
                      { id: 'sms', label: 'SMS Notifications', desc: 'Urgent broadcast blasts & OTP confirmations', icon: Mail, color: 'text-amber-600 bg-amber-50 border-amber-200/60' },
                      { id: 'email', label: 'Email Reports', desc: 'Weekly financial summaries & statements', icon: Mail, color: 'text-purple-600 bg-purple-50 border-purple-200/60' }
                    ].map(channel => {
                      const isEnabled = settings.notifications[channel.id];
                      return (
                        <div key={channel.id} className="p-5 rounded-xl border border-zinc-200 hover:border-zinc-300 bg-white transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${channel.color}`}>
                                <channel.icon size={18} strokeWidth={1.75} />
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-zinc-100 text-zinc-500'}`}>
                                {isEnabled ? 'Active' : 'Muted'}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-zinc-900">{channel.label}</h4>
                            <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{channel.desc}</p>
                          </div>
                          <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-zinc-600">Channel Status</span>
                            <ToggleSwitch 
                              checked={isEnabled}
                              onChange={() => handleInputChange('notifications', channel.id, !isEnabled)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Operational Quiet Hours & Health Check */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 mt-6 border-t border-zinc-100">
                    <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Clock size={16} className="text-zinc-500" />
                          <h4 className="text-xs font-bold text-zinc-900">Operational Quiet Hours</h4>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">Recommended</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">Mute promotional and non-essential notifications during overnight hours.</p>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Window Start</label>
                          <input 
                            type="time" 
                            value={settings.notifications.quietHoursStart}
                            onChange={(e) => handleInputChange('notifications', 'quietHoursStart', e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Window End</label>
                          <input 
                            type="time" 
                            value={settings.notifications.quietHoursEnd}
                            onChange={(e) => handleInputChange('notifications', 'quietHoursEnd', e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Wifi size={16} className="text-zinc-500" />
                            <h4 className="text-xs font-bold text-zinc-900">Channel Gateway Health</h4>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          Active persistent connections to Twilio, WhatsApp Cloud API, and transactional SMTP gateways.
                        </p>
                        <div className="flex items-center gap-4 text-xs font-medium text-zinc-600 pt-1">
                          <span>Latency: <strong className="text-zinc-900 font-semibold">142ms</strong></span>
                          <span>•</span>
                          <span>Delivery Rate: <strong className="text-emerald-700 font-semibold">99.98%</strong></span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-zinc-200/80 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">Dispatch test message to admin</span>
                        <button 
                          type="button"
                          onClick={() => alert("Test diagnostic alert sent successfully to admin devices.")}
                          className="h-8 px-3 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-900 transition-colors shadow-2xs cursor-pointer"
                        >
                          Send Test Alert
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Automation" && (
              <motion.div 
                key="automation"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* 13. SYSTEM AUTOPILOT & OPERATIONAL WORKFLOWS */}
                <section className="bg-white rounded-2xl border border-zinc-200/90 p-7 sm:p-8 shadow-xs">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-900 shadow-2xs">
                        <Zap size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">System Autopilot & Operational Workflows</h2>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">Configure intelligent triggers for memberships, attendance, PT sessions, and billing</p>
                      </div>
                    </div>
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 text-xs font-semibold">
                      <Cpu size={13} strokeWidth={1.75} />
                      <span>6 Active Triggers</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6 border-t border-zinc-100">
                    {/* Membership Automation */}
                    <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                          <RefreshCw size={16} strokeWidth={1.75} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-zinc-900">Membership Automation</h3>
                          <p className="text-[11px] text-zinc-500">Lifecycle & renewal policies</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between shadow-2xs">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-zinc-900">Renewal Reminders</div>
                            <div className="text-[11px] text-zinc-500">WhatsApp & SMS 3 days prior to expiry</div>
                          </div>
                          <ToggleSwitch 
                            checked={settings.automation.renewalReminders}
                            onChange={() => handleInputChange('automation', 'renewalReminders', !settings.automation.renewalReminders)}
                          />
                        </div>

                        <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between shadow-2xs">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-zinc-900">Auto-Freeze Inactive Members</div>
                            <div className="text-[11px] text-zinc-500">Freeze memberships after 15 days non-attendance</div>
                          </div>
                          <ToggleSwitch 
                            checked={settings.automation.autoFreeze}
                            onChange={() => handleInputChange('automation', 'autoFreeze', !settings.automation.autoFreeze)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Attendance Automation */}
                    <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                          <UserCheck size={16} strokeWidth={1.75} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-zinc-900">Attendance Automation</h3>
                          <p className="text-[11px] text-zinc-500">Biometrics & check-in gates</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between shadow-2xs">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-zinc-900">Auto-Approve Check-ins</div>
                            <div className="text-[11px] text-zinc-500">Instant QR & biometric gate pass validation</div>
                          </div>
                          <ToggleSwitch 
                            checked={settings.automation.attendanceAutoCheckin}
                            onChange={() => handleInputChange('automation', 'attendanceAutoCheckin', !settings.automation.attendanceAutoCheckin)}
                          />
                        </div>

                        <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between shadow-2xs">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-zinc-900">Check-in Grace Window</div>
                            <div className="text-[11px] text-zinc-500">Tolerance before session marked late</div>
                          </div>
                          <div className="w-48">
                            <CustomSelect 
                              value={settings.automation.attendanceGraceMinutes || "30"}
                              options={graceWindowOptions}
                              onChange={(val) => handleInputChange('automation', 'attendanceGraceMinutes', val)}
                              icon={Clock}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PT Sessions Automation */}
                    <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                          <Activity size={16} strokeWidth={1.75} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-zinc-900">PT Sessions Automation</h3>
                          <p className="text-[11px] text-zinc-500">Trainer allocations & session deductions</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between shadow-2xs">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-zinc-900">Auto Session Deductions</div>
                            <div className="text-[11px] text-zinc-500">Decrement credit balance immediately after workout</div>
                          </div>
                          <ToggleSwitch 
                            checked={settings.automation.ptBillingTriggers}
                            onChange={() => handleInputChange('automation', 'ptBillingTriggers', !settings.automation.ptBillingTriggers)}
                          />
                        </div>

                        <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between shadow-2xs">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-zinc-900">Lead Management Autopilot</div>
                            <div className="text-[11px] text-zinc-500">Schedule trainer consultation follow-ups</div>
                          </div>
                          <ToggleSwitch 
                            checked={settings.automation.leadFollowups}
                            onChange={() => handleInputChange('automation', 'leadFollowups', !settings.automation.leadFollowups)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Billing Automation */}
                    <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                          <CreditCard size={16} strokeWidth={1.75} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-zinc-900">Billing Automation</h3>
                          <p className="text-[11px] text-zinc-500">Invoices & payment recovery</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between shadow-2xs">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-zinc-900">Recurring Invoicing Autopilot</div>
                            <div className="text-[11px] text-zinc-500">Generate digital GST receipts upon renewal</div>
                          </div>
                          <ToggleSwitch 
                            checked={settings.automation.billingInvoiceAutopilot}
                            onChange={() => handleInputChange('automation', 'billingInvoiceAutopilot', !settings.automation.billingInvoiceAutopilot)}
                          />
                        </div>

                        <div className="p-3.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between shadow-2xs">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-zinc-900">Retry Failed Payments</div>
                            <div className="text-[11px] text-zinc-500">Automated re-attempt for UPI & card mandates</div>
                          </div>
                          <ToggleSwitch 
                            checked={settings.automation.billingRetryFailed}
                            onChange={() => handleInputChange('automation', 'billingRetryFailed', !settings.automation.billingRetryFailed)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Refined Dark Workflow Banner */}
                  <div className="mt-8 p-7 rounded-2xl bg-zinc-950 border border-zinc-800 text-white overflow-hidden relative group">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="max-w-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={16} className="text-zinc-400" />
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Visual Workflow Engine</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight">Create Custom Multi-Step Automations</h3>
                        <p className="text-xs font-normal text-zinc-400 leading-relaxed mb-5">
                          Chain complex operational triggers across attendance, member renewals, trainer commissions, and billing recovery without writing any code.
                        </p>
                        <button 
                          type="button"
                          onClick={() => alert("Visual Workflow Builder workspace is currently in active preview.")}
                          className="h-9 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-semibold transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                          <span>Launch Builder</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                      <div className="hidden lg:flex items-center justify-center">
                        <div className="w-32 h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
                          <Code size={40} className="text-zinc-500" strokeWidth={1.5} />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Security" && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* 14. SECURITY & ACCESS GOVERNANCE */}
                <section className="bg-white rounded-2xl border border-zinc-200/90 p-7 sm:p-8 shadow-xs">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-900 shadow-2xs">
                        <Shield size={18} strokeWidth={1.75} />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">Security & Access Governance</h2>
                        <p className="text-xs text-zinc-500 font-normal mt-0.5">Manage staff permissions, session limits, 2FA, and compliance audit trails</p>
                      </div>
                    </div>
                    <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold">
                      <ShieldCheck size={13} strokeWidth={1.75} />
                      <span>SOC-2 Compliant</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 border-t border-zinc-100">
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                      {/* 2FA & Session Control Toggles */}
                      <div className="space-y-3">
                        {[
                          { id: 'twoFactor', label: 'Two-Factor Authentication (2FA)', desc: 'Enforce TOTP authenticator app or WhatsApp OTP for all admin accounts', icon: Fingerprint },
                          { id: 'deviceControl', label: 'Device & Hardware Lockdown', desc: 'Notify on unrecognized hardware logins and terminate stale sessions', icon: Smartphone },
                          { id: 'ipRestriction', label: 'Office IP Restriction', desc: 'Restrict front-desk and cashier dashboard access to registered static IPs', icon: Lock }
                        ].map(rule => (
                          <div key={rule.id} className="p-4 rounded-xl bg-zinc-50/60 border border-zinc-200/80 flex items-center justify-between">
                            <div className="flex items-center gap-3.5">
                              <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                                <rule.icon size={17} strokeWidth={1.75} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-zinc-900">{rule.label}</div>
                                <p className="text-[11px] text-zinc-500 mt-0.5 max-w-md">{rule.desc}</p>
                              </div>
                            </div>
                            <ToggleSwitch 
                              checked={settings.security[rule.id]}
                              onChange={() => handleInputChange('security', rule.id, !settings.security[rule.id])}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Staff Role Permissions */}
                      <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-900 shadow-2xs">
                              <Users size={16} strokeWidth={1.75} />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-zinc-900">Role Permissions & Access Matrix</h3>
                              <p className="text-[11px] text-zinc-500">Configured privilege tiers</p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => alert("Role matrix configuration modal.")}
                            className="text-xs font-semibold text-zinc-900 hover:text-zinc-600 transition-colors cursor-pointer underline underline-offset-2"
                          >
                            Edit Matrix
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                          {[
                            { role: 'Owner', desc: 'Full Superadmin' },
                            { role: 'Branch Manager', desc: 'Ops & Staff' },
                            { role: 'Trainer', desc: 'Assigned Clients' },
                            { role: 'Front Desk', desc: 'Check-in & POS' }
                          ].map(r => (
                            <div key={r.role} className="p-3 bg-white border border-zinc-200/90 rounded-xl text-center shadow-2xs">
                              <div className="text-xs font-bold text-zinc-900">{r.role}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{r.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Session Timeout & Access Logs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Session Inactivity Timeout</label>
                            <span className="text-[11px] font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200/60">{settings.security.sessionTimeout} Min</span>
                          </div>
                          <input 
                            type="range" 
                            min="5" 
                            max="120" 
                            step="5"
                            value={settings.security.sessionTimeout}
                            onChange={(e) => handleInputChange('security', 'sessionTimeout', e.target.value)}
                            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                          />
                          <div className="flex justify-between text-[10px] font-medium text-zinc-400 px-0.5">
                            <span>5 min</span>
                            <span>60 min</span>
                            <span>120 min</span>
                          </div>
                        </div>

                        <div>
                          <CustomSelect 
                            label="Access Logs Retention"
                            value={settings.security.accessLogsRetention || "90"}
                            options={retentionOptions}
                            onChange={(val) => handleInputChange('security', 'accessLogsRetention', val)}
                            icon={Database}
                            description="1,248 actions recorded • Zero unauthorized breaches"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-span-12 lg:col-span-4 space-y-5">
                      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Security Posture</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">Optimal</span>
                        </div>
                        <div className="space-y-2.5">
                          {[
                            { label: 'SSL/TLS 1.3 Encryption', status: 'Active', color: 'text-emerald-700' },
                            { label: 'Hardware Attestation', status: 'Shielded', color: 'text-emerald-700' },
                            { label: 'Login Rate Limiter', status: 'Enabled', color: 'text-emerald-700' },
                            { label: 'Live Audit Telemetry', status: 'Active', color: 'text-emerald-700' }
                          ].map(item => (
                            <div key={item.label} className="flex items-center justify-between text-xs py-1 border-b border-zinc-200/40 last:border-b-0">
                              <span className="text-zinc-600 font-medium">{item.label}</span>
                              <span className={`font-semibold ${item.color} text-[11px]`}>{item.status}</span>
                            </div>
                          ))}
                        </div>
                        <button 
                          type="button"
                          onClick={() => alert("Security audit report downloaded.")}
                          className="w-full mt-2 h-9 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-xs font-semibold text-zinc-900 transition-colors shadow-2xs cursor-pointer"
                        >
                          Export Security Audit
                        </button>
                      </div>

                      <div className="p-5 rounded-xl bg-rose-50/50 border border-rose-200/80 flex flex-col items-center text-center">
                        <AlertTriangle className="text-rose-600 mb-2" size={20} strokeWidth={1.75} />
                        <h4 className="text-xs font-bold text-rose-900 mb-1">Danger Zone</h4>
                        <p className="text-[11px] text-rose-700/90 leading-relaxed mb-3">
                          Sensitive system overrides and permanent data controls.
                        </p>
                        <button 
                          type="button"
                          onClick={() => alert("Authentication credentials required for Danger Zone.")}
                          className="h-8 px-3 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 transition-colors shadow-2xs cursor-pointer"
                        >
                          Advanced Access
                        </button>
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

      {/* 21. STICKY BOTTOM SAVE BAR */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 inset-x-0 z-[200] max-w-4xl mx-auto px-4"
          >
            <div className="bg-[#111827]/90 backdrop-blur-xl rounded-[32px] p-4 border border-white/20 shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-4 px-4">
                <div className="w-10 h-10 rounded-2xl bg-[#6366F1] flex items-center justify-center text-white animate-pulse">
                  <Activity size={20} />
                </div>
                <div>
                  <div className="text-xs font-black text-white leading-none mb-1">Unsaved Configuration Changes</div>
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">Modified 3 parameters in {activeTab}</div>
                </div>
              </div>
              <div className="flex gap-3 pr-2">
                <button 
                  onClick={() => setHasChanges(false)}
                  className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSave}
                  className="h-12 px-8 rounded-2xl bg-[#6366F1] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#4F46E5] transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? "Applying..." : "Apply Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNT UTILITY
// ─────────────────────────────────────────
export function mountAppSettings(container) {
  const target = container || document.querySelector('[data-stage="app-settings"]');
  if (!target) return null;
  const root = createRoot(target);
  root.render(<AppSettings />);
  return root;
}

export default AppSettings;
