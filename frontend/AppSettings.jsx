import React, { useState, useEffect, useMemo } from "react";
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
  History,
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
  Search as SearchIcon
} from "lucide-react";

/**
 * GYMDECK • APP SETTINGS & SYSTEM CONFIGURATION
 * Enterprise Production-Grade Platform Infrastructure
 */

const AppSettings = () => {
  const [activeTab, setActiveTab] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      <header className="sticky top-0 z-[100] h-16 bg-white backdrop-blur-md border-b border-[#E5E7EB] px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            <span>Settings</span>
            <ChevronRight size={14} className="mx-2" />
            <span className="text-[#111827]">App Settings</span>
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input 
              type="text" 
              placeholder="Search settings, permissions, integrations, automations..."
              className="w-full h-10 pl-10 pr-4 bg-[#F3F4F6] border-none rounded-full text-sm focus:ring-2 focus:ring-[#111827] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-bold flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors text-[#4B5563]">
            <History size={18} />
            Activity Logs
          </button>
          <button className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-bold flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors text-[#4B5563]">
            <Activity size={18} />
            Diagnostics
          </button>
          <button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`h-10 px-6 rounded-lg text-sm font-bold transition-all shadow-lg shadow-black/10 flex items-center gap-2
              ${hasChanges ? 'bg-[#111827] text-white hover:bg-[#1F2937]' : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed shadow-none'}`}
          >
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </header>

      {/* 6. SYSTEM STATUS HERO SECTION */}
      <section className="relative h-[240px] w-full overflow-hidden bg-[#111827]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#4F46E5_0%,transparent_50%)]" />
          <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto h-full px-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white">
                Platform Infrastructure
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full text-[10px] font-bold text-[#10B981]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                Operational
              </div>
            </div>
            <h1 className="text-[44px] font-black text-white leading-tight tracking-tight mb-4">
              GymDeck Platform <br />
              <span className="text-white/40">Control Center</span>
            </h1>
            <p className="text-white/50 text-sm max-w-xl font-medium leading-relaxed">
              Configure platform behavior, automation workflows, notifications, security, and operational preferences across your entire GymDeck ecosystem.
            </p>
          </div>

          <div className="flex gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-w-[200px]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Wifi size={20} />
                </div>
                <div className="text-[10px] font-black text-[#10B981] uppercase tracking-widest">Stable</div>
              </div>
              <div className="text-2xl font-black text-white">0.42ms</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Sync Latency</div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-w-[200px]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Smartphone size={20} />
                </div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">v1.2.4-PRO</div>
              </div>
              <div className="text-2xl font-black text-white">428</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Active Nodes</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SETTINGS NAVIGATION TABS (REMAINS BELOW THE BANNER) */}
      <div className="max-w-[1600px] mx-auto px-8 -mt-7 relative z-20">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-1.5 shadow-sm flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileTap={{ scale: 0.97 }}
                className={`relative flex-1 h-12 px-5 lg:px-6 rounded-xl text-xs transition-colors whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer select-none group
                  ${isActive 
                    ? 'text-[#111827] font-semibold' 
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]/80 font-medium'}`}
                role="tab"
                aria-selected={isActive}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeSettingsTabPill"
                    className="absolute inset-0 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1]/80 shadow-xs"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon 
                    size={16} 
                    strokeWidth={isActive ? 2 : 1.75} 
                    className={`transition-colors shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#9CA3AF] group-hover:text-[#4B5563]'}`} 
                  />
                  <span>{tab.label}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-8 pt-10">
        
        {/* MAIN CONFIGURATION WORKSPACE (Spans full width - sidebars removed for maximum clarity & workspace) */}
        <main className="w-full space-y-8">
          
          <AnimatePresence mode="wait">
            {activeTab === "General" && (
              <motion.div 
                key="general"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 10. GENERAL SETTINGS SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Globe size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Localization & Regional</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Configure language, time, and currency defaults</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">App Language</label>
                      <select 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none"
                        value={settings.general.language}
                        onChange={(e) => handleInputChange('general', 'language', e.target.value)}
                      >
                        <option>English</option>
                        <option>Hindi</option>
                        <option>Bengali</option>
                        <option>Spanish</option>
                        <option>French</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Operating Region & Country</label>
                      <select 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none"
                        value={settings.general.region || "India"}
                        onChange={(e) => handleInputChange('general', 'region', e.target.value)}
                      >
                        <option value="India">India (IN - GST / PAN / ₹)</option>
                        <option value="United States">United States (US - EIN / $)</option>
                        <option value="United Kingdom">United Kingdom (UK - VAT / £)</option>
                        <option value="United Arab Emirates">United Arab Emirates (UAE - TRN / د.إ)</option>
                        <option value="Canada">Canada (CA - HST / $)</option>
                        <option value="Australia">Australia (AU - ABN / $)</option>
                        <option value="Singapore">Singapore (SG - UEN / $)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Time Zone</label>
                      <select 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none"
                        value={settings.general.timezone}
                        onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                      >
                        <option>Asia/Kolkata (GMT+05:30)</option>
                        <option>UTC (GMT+00:00)</option>
                        <option>America/New_York (GMT-05:00)</option>
                        <option>Europe/London (GMT+00:00)</option>
                        <option>Asia/Dubai (GMT+04:00)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Primary Currency</label>
                      <select 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none"
                        value={settings.general.currency}
                        onChange={(e) => handleInputChange('general', 'currency', e.target.value)}
                      >
                        <option>INR (₹)</option>
                        <option>USD ($)</option>
                        <option>EUR (€)</option>
                        <option>GBP (£)</option>
                        <option>AED (د.إ)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Date Format</label>
                      <select 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none"
                        value={settings.general.dateFormat}
                        onChange={(e) => handleInputChange('general', 'dateFormat', e.target.value)}
                      >
                        <option>DD/MM/YYYY</option>
                        <option>MM/DD/YYYY</option>
                        <option>YYYY-MM-DD</option>
                        <option>DD-MMM-YYYY</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">First Day of Week</label>
                      <select 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none"
                        value={settings.general.firstDayOfWeek || "Monday"}
                        onChange={(e) => handleInputChange('general', 'firstDayOfWeek', e.target.value)}
                      >
                        <option value="Monday">Monday (ISO 8601 Standard)</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Appearance" && (
              <motion.div 
                key="appearance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 11. APPEARANCE SETTINGS SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Layout size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Theme & Visual Experience</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Personalize the GymDeck interface and layout</p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">System Theme</label>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { id: 'light', label: 'Light Mode', icon: Sun },
                          { id: 'dark', label: 'Dark Mode', icon: Moon },
                          { id: 'system', label: 'System Sync', icon: Monitor }
                        ].map(theme => (
                          <button 
                            key={theme.id}
                            onClick={() => handleInputChange('appearance', 'theme', theme.id)}
                            className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all
                              ${settings.appearance.theme === theme.id ? 'border-[#111827] bg-[#F9FAFB]' : 'border-[#F3F4F6] hover:border-[#E5E7EB]'}`}
                          >
                            <theme.icon size={24} className={`mb-3 ${settings.appearance.theme === theme.id ? 'text-[#111827]' : 'text-[#9CA3AF]'}`} />
                            <span className={`text-xs font-bold ${settings.appearance.theme === theme.id ? 'text-[#111827]' : 'text-[#6B7280]'}`}>{theme.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">UI Density</label>
                        <div className="flex p-1 bg-[#F3F4F6] rounded-xl">
                          {['Compact', 'Comfortable', 'Spacious'].map(d => (
                            <button 
                              key={d}
                              onClick={() => handleInputChange('appearance', 'density', d.toLowerCase())}
                              className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all
                                ${settings.appearance.density === d.toLowerCase() ? 'bg-white text-[#111827] shadow-sm' : 'text-[#9CA3AF] hover:text-[#4B5563]'}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Animations</label>
                        <div className="flex p-1 bg-[#F3F4F6] rounded-xl">
                          {['Disabled', 'Standard', 'Cinematic'].map(a => (
                            <button 
                              key={a}
                              onClick={() => handleInputChange('appearance', 'animations', a.toLowerCase())}
                              className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all
                                ${settings.appearance.animations === a.toLowerCase() ? 'bg-white text-[#111827] shadow-sm' : 'text-[#9CA3AF] hover:text-[#4B5563]'}`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Typography & Sidebar Settings (Moved from left side into Appearance page) */}
                    <div className="grid grid-cols-2 gap-10 pt-6 border-t border-[#F3F4F6]">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Typography & Font System</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: 'standard', label: 'Inter 14px', desc: 'Standard UI' },
                            { id: 'compact', label: 'Dense 13px', desc: 'Data heavy' },
                            { id: 'large', label: 'Large 15px', desc: 'High legibility' }
                          ].map(f => (
                            <button 
                              key={f.id}
                              type="button"
                              onClick={() => handleInputChange('appearance', 'typography', f.id)}
                              className={`p-3.5 rounded-xl border-2 text-left transition-all ${settings.appearance.typography === f.id ? 'border-[#111827] bg-[#F9FAFB]' : 'border-[#F3F4F6] hover:border-[#E5E7EB]'}`}
                            >
                              <div className="text-xs font-bold text-[#111827] mb-0.5">{f.label}</div>
                              <div className="text-[9px] text-[#6B7280]">{f.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Navigation Sidebar Mode</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { id: 'hover-expand', label: 'Hover Expand', desc: 'Auto-flyout' },
                            { id: 'always-expanded', label: 'Expanded', desc: 'Fixed 240px' },
                            { id: 'compact', label: 'Icon Rail', desc: 'Minimal strip' }
                          ].map(s => (
                            <button 
                              key={s.id}
                              type="button"
                              onClick={() => handleInputChange('appearance', 'sidebarMode', s.id)}
                              className={`p-3.5 rounded-xl border-2 text-left transition-all ${settings.appearance.sidebarMode === s.id ? 'border-[#111827] bg-[#F9FAFB]' : 'border-[#F3F4F6] hover:border-[#E5E7EB]'}`}
                            >
                              <div className="text-xs font-bold text-[#111827] mb-0.5">{s.label}</div>
                              <div className="text-[9px] text-[#6B7280]">{s.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Notifications" && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 12. NOTIFICATION SETTINGS SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Bell size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Channel Communication</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Manage how the platform interacts with members and staff</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    {[
                      { id: 'push', label: 'Push Notifications', icon: Smartphone, color: 'text-blue-500' },
                      { id: 'whatsapp', label: 'WhatsApp Alerts', icon: MessageSquare, color: 'text-green-500' },
                      { id: 'sms', label: 'SMS Notifications', icon: Mail, color: 'text-amber-500' },
                      { id: 'email', label: 'Email Reports', icon: Mail, color: 'text-red-500' }
                    ].map(channel => (
                      <div key={channel.id} className="p-6 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between group hover:border-[#D1D5DB] transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${channel.color} shadow-sm border border-[#F3F4F6]`}>
                            <channel.icon size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-[#111827]">{channel.label}</div>
                            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Active Channel</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleInputChange('notifications', channel.id, !settings.notifications[channel.id])}
                          className={`w-12 h-6 rounded-full transition-all relative ${settings.notifications[channel.id] ? 'bg-[#111827]' : 'bg-[#E5E7EB]'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.notifications[channel.id] ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 pt-10 border-t border-[#F3F4F6] space-y-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] ml-2">Advanced Scheduling</h3>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-[#111827]">Operational Quiet Hours</label>
                          <div className="text-[10px] font-black text-[#10B981] uppercase">Recommended</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-1">
                            <span className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest ml-1">Start</span>
                            <input 
                              type="time" 
                              value={settings.notifications.quietHoursStart}
                              onChange={(e) => handleInputChange('notifications', 'quietHoursStart', e.target.value)}
                              className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold" 
                            />
                          </div>
                          <ChevronRight size={16} className="text-[#D1D5DB] mt-4" />
                          <div className="flex-1 space-y-1">
                            <span className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest ml-1">End</span>
                            <input 
                              type="time" 
                              value={settings.notifications.quietHoursEnd}
                              onChange={(e) => handleInputChange('notifications', 'quietHoursEnd', e.target.value)}
                              className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm font-bold" 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#F3F4F6] rounded-2xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#111827] shadow-sm">
                          <Bell size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-black mb-1">Channel Health Check</div>
                          <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed mb-3">Ensure your API connections for WhatsApp and Email are active.</p>
                          <button className="text-[9px] font-black uppercase tracking-widest text-[#111827] underline underline-offset-4">Send Test Alert</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Automation" && (
              <motion.div 
                key="automation"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 13. AUTOMATION SETTINGS SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">System Autopilot & Operational Workflows</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Configure intelligent triggers for memberships, attendance, PT sessions, and billing</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Membership Automation */}
                    <div className="p-6 rounded-2xl border border-[#F3F4F6] bg-[#FAFAFA] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#111827] shadow-2xs">
                          <RefreshCw size={18} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-[#111827]">Membership Automation</h3>
                          <p className="text-[10px] text-[#9CA3AF] font-bold">Lifecycle & renewal policies</p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-[#111827]">Renewal Reminders</div>
                            <div className="text-[10px] text-[#6B7280]">WhatsApp & SMS 3 days prior to expiry</div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleInputChange('automation', 'renewalReminders', !settings.automation.renewalReminders)}
                            className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.automation.renewalReminders ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.automation.renewalReminders ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-[#111827]">Auto-Freeze Inactive Members</div>
                            <div className="text-[10px] text-[#6B7280]">Freeze memberships after 15 days non-attendance</div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleInputChange('automation', 'autoFreeze', !settings.automation.autoFreeze)}
                            className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.automation.autoFreeze ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.automation.autoFreeze ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Attendance Automation */}
                    <div className="p-6 rounded-2xl border border-[#F3F4F6] bg-[#FAFAFA] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#111827] shadow-2xs">
                          <UserCheck size={18} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-[#111827]">Attendance Automation</h3>
                          <p className="text-[10px] text-[#9CA3AF] font-bold">Biometrics & check-in gates</p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-[#111827]">Auto-Approve Check-ins</div>
                            <div className="text-[10px] text-[#6B7280]">Instant QR & biometric gate pass validation</div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleInputChange('automation', 'attendanceAutoCheckin', !settings.automation.attendanceAutoCheckin)}
                            className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.automation.attendanceAutoCheckin ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.automation.attendanceAutoCheckin ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-[#111827]">Check-in Grace Window</div>
                            <div className="text-[10px] text-[#6B7280]">Tolerance before shift/session marked late</div>
                          </div>
                          <select 
                            value={settings.automation.attendanceGraceMinutes || "30"}
                            onChange={(e) => handleInputChange('automation', 'attendanceGraceMinutes', e.target.value)}
                            className="h-8 px-2.5 text-xs font-bold bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg"
                          >
                            <option value="15">15 Mins</option>
                            <option value="30">30 Mins</option>
                            <option value="60">60 Mins</option>
                            <option value="all-day">Unrestricted</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* PT Sessions Automation */}
                    <div className="p-6 rounded-2xl border border-[#F3F4F6] bg-[#FAFAFA] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#111827] shadow-2xs">
                          <Activity size={18} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-[#111827]">PT Sessions Automation</h3>
                          <p className="text-[10px] text-[#9CA3AF] font-bold">Trainer allocations & session deductions</p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-[#111827]">Auto Session Deductions</div>
                            <div className="text-[10px] text-[#6B7280]">Decrement credit balance immediately after workout</div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleInputChange('automation', 'ptBillingTriggers', !settings.automation.ptBillingTriggers)}
                            className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.automation.ptBillingTriggers ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.automation.ptBillingTriggers ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-[#111827]">Lead Management Autopilot</div>
                            <div className="text-[10px] text-[#6B7280]">Schedule trainer consultation follow-ups</div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleInputChange('automation', 'leadFollowups', !settings.automation.leadFollowups)}
                            className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.automation.leadFollowups ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.automation.leadFollowups ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Billing Automation */}
                    <div className="p-6 rounded-2xl border border-[#F3F4F6] bg-[#FAFAFA] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#111827] shadow-2xs">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-[#111827]">Billing Automation</h3>
                          <p className="text-[10px] text-[#9CA3AF] font-bold">Invoices & payment recovery</p>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-[#111827]">Recurring Invoicing Autopilot</div>
                            <div className="text-[10px] text-[#6B7280]">Generate digital GST receipts upon renewal</div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleInputChange('automation', 'billingInvoiceAutopilot', !settings.automation.billingInvoiceAutopilot)}
                            className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.automation.billingInvoiceAutopilot ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.automation.billingInvoiceAutopilot ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between">
                          <div className="pr-3">
                            <div className="text-xs font-bold text-[#111827]">Retry Failed Payments</div>
                            <div className="text-[10px] text-[#6B7280]">Daily automated re-attempt for UPI & card mandates</div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleInputChange('automation', 'billingRetryFailed', !settings.automation.billingRetryFailed)}
                            className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.automation.billingRetryFailed ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.automation.billingRetryFailed ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-8 rounded-3xl bg-[#111827] text-white overflow-hidden relative group cursor-pointer">
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="max-w-md">
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles size={18} className="text-[#6366F1]" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6366F1]">New Feature</span>
                        </div>
                        <h3 className="text-xl font-black mb-2">Visual Workflow Builder</h3>
                        <p className="text-xs font-medium text-white/50 leading-relaxed mb-6">
                          Create custom automation flows using our drag-and-drop orchestration engine. 
                          Design complex triggers for billing, retention, and coaching.
                        </p>
                        <button className="h-10 px-6 rounded-xl bg-white text-[#111827] text-[10px] font-black uppercase tracking-widest hover:bg-[#6366F1] hover:text-white transition-all flex items-center gap-2">
                          Launch Builder
                          <ArrowRight size={14} />
                        </button>
                      </div>
                      <div className="hidden lg:block">
                        <div className="w-48 h-48 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/20 to-transparent rounded-full animate-pulse" />
                          <Code size={64} className="text-white opacity-20" />
                        </div>
                      </div>
                    </div>
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#6366F1]/20 rounded-full blur-3xl group-hover:bg-[#6366F1]/40 transition-all" />
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Security" && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 14. SECURITY SETTINGS SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Security & Access Governance</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Manage staff permissions, session limits, 2FA, and audit trails</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-10">
                    <div className="col-span-8 space-y-8">
                      {/* 2FA & Session Control Toggles */}
                      <div className="space-y-5">
                        {[
                          { id: 'twoFactor', label: 'Two-Factor Authentication (2FA)', desc: 'Enforce TOTP authenticator app or WhatsApp OTP for all admin accounts', icon: Fingerprint },
                          { id: 'deviceControl', label: 'Device & Session Control', desc: 'Notify on unrecognized hardware logins and terminate stale sessions', icon: Smartphone },
                          { id: 'ipRestriction', label: 'Office IP Restriction', desc: 'Restrict front-desk and cashier dashboard access to registered static IPs', icon: Lock }
                        ].map(rule => (
                          <div key={rule.id} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#F3F4F6] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#111827] shadow-2xs">
                                <rule.icon size={20} />
                              </div>
                              <div>
                                <div className="text-sm font-black text-[#111827]">{rule.label}</div>
                                <p className="text-[11px] font-bold text-[#6B7280] max-w-md">{rule.desc}</p>
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleInputChange('security', rule.id, !settings.security[rule.id])}
                              className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.security[rule.id] ? 'bg-[#10B981]' : 'bg-[#E5E7EB]'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.security[rule.id] ? 'left-6' : 'left-1'}`} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Staff Role Permissions */}
                      <div className="p-6 rounded-2xl border border-[#F3F4F6] bg-[#FAFAFA] space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#111827] shadow-2xs">
                              <Users size={18} />
                            </div>
                            <div>
                              <h3 className="text-xs font-black uppercase tracking-wider text-[#111827]">Role Permissions & Access Control</h3>
                              <p className="text-[10px] text-[#9CA3AF] font-bold">Configure staff privilege tiers</p>
                            </div>
                          </div>
                          <button className="text-[10px] font-black uppercase tracking-wider text-[#2563EB] hover:underline">
                            Edit Matrix
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2.5 pt-1">
                          {[
                            { role: 'Owner', desc: 'Full Superadmin' },
                            { role: 'Branch Manager', desc: 'Ops & Staff' },
                            { role: 'Trainer', desc: 'Assigned Clients' },
                            { role: 'Front Desk', desc: 'Check-in & POS' }
                          ].map(r => (
                            <div key={r.role} className="p-3 bg-white border border-[#E5E7EB] rounded-xl text-center">
                              <div className="text-xs font-black text-[#111827]">{r.role}</div>
                              <div className="text-[9px] font-bold text-[#6B7280] mt-0.5">{r.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Session Timeout & Access Logs */}
                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[#F3F4F6]">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Session Inactivity Timeout</label>
                            <span className="text-[10px] font-black text-[#111827] uppercase bg-[#F3F4F6] px-2 py-0.5 rounded-md">{settings.security.sessionTimeout} Min</span>
                          </div>
                          <input 
                            type="range" 
                            min="5" 
                            max="120" 
                            step="5"
                            value={settings.security.sessionTimeout}
                            onChange={(e) => handleInputChange('security', 'sessionTimeout', e.target.value)}
                            className="w-full h-2 bg-[#F3F4F6] rounded-lg appearance-none cursor-pointer accent-[#111827]"
                          />
                          <div className="flex justify-between text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest px-1">
                            <span>5 min</span>
                            <span>60 min</span>
                            <span>120 min</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Access Logs Retention</label>
                          <select 
                            value={settings.security.accessLogsRetention || "90"}
                            onChange={(e) => handleInputChange('security', 'accessLogsRetention', e.target.value)}
                            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-xs font-bold"
                          >
                            <option value="30">30 Days (Compliance Baseline)</option>
                            <option value="90">90 Days (Recommended)</option>
                            <option value="180">180 Days (Extended)</option>
                            <option value="365">365 Days (Full Fiscal Year)</option>
                          </select>
                          <div className="text-[9px] text-[#6B7280] font-bold">1,248 actions recorded • Zero unauthorized breaches</div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-4 space-y-6">
                      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#111827] mb-4">Security Status</h4>
                        <div className="space-y-4">
                          {[
                            { label: 'SSL Encryption', status: 'Active', color: 'text-[#10B981]' },
                            { label: 'Firewall', status: 'Shielded', color: 'text-[#10B981]' },
                            { label: 'Login Alerts', status: 'Enabled', color: 'text-[#10B981]' },
                            { label: 'Audit Logging', status: 'Live', color: 'text-[#10B981]' }
                          ].map(item => (
                            <div key={item.label} className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#6B7280]">{item.label}</span>
                              <span className={`text-[10px] font-black uppercase ${item.color}`}>{item.status}</span>
                            </div>
                          ))}
                        </div>
                        <button className="w-full mt-6 h-10 rounded-xl bg-white border border-[#E5E7EB] text-[10px] font-black uppercase tracking-widest hover:bg-[#F3F4F6] transition-all">
                          Security Audit
                        </button>
                      </div>

                      <div className="p-6 rounded-2xl bg-[#FEF2F2] border border-[#FEE2E2] flex flex-col items-center text-center">
                        <AlertTriangle className="text-[#EF4444] mb-3" size={24} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#EF4444] mb-1">Danger Zone</h4>
                        <p className="text-[10px] font-bold text-[#B91C1C] leading-relaxed mb-4">
                          Sensitive system overrides and permanent data controls.
                        </p>
                        <button className="text-[9px] font-black uppercase tracking-widest text-[#EF4444] underline underline-offset-4">Advanced Access</button>
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
  const root = createRoot(container);
  root.render(<AppSettings />);
}

export default AppSettings;
