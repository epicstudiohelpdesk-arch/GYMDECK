import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
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
      dateFormat: "DD/MM/YYYY"
    },
    appearance: {
      theme: "system",
      density: "comfortable",
      sidebarMode: "hover-expand",
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
      leadFollowups: true
    },
    security: {
      twoFactor: false,
      sessionTimeout: "30",
      deviceControl: true,
      ipRestriction: false
    },
    performance: {
      cacheManagement: "aggressive",
      syncFrequency: "real-time",
      imageOptimization: true
    }
  });

  const tabs = [
    "General", "Appearance", "Notifications", "Automation", 
    "Security", "Integrations", "Performance", "Data & Backup", "Advanced"
  ];

  const sidebarCategories = [
    { 
      label: "GENERAL", 
      icon: Settings,
      items: ["Language", "Region", "Date & Time", "Currency"] 
    },
    { 
      label: "APPEARANCE", 
      icon: Layout,
      items: ["Theme", "Layout Density", "Typography", "Sidebar Settings"] 
    },
    { 
      label: "NOTIFICATIONS", 
      icon: Bell,
      items: ["Push Alerts", "WhatsApp", "SMS", "Email"] 
    },
    { 
      label: "AUTOMATION", 
      icon: Zap,
      items: ["Membership", "Attendance", "PT Sessions", "Billing"] 
    },
    { 
      label: "SECURITY", 
      icon: Shield,
      items: ["Permissions", "Session Control", "2FA", "Access Logs"] 
    },
    { 
      label: "PERFORMANCE", 
      icon: Cpu,
      items: ["Cache", "Sync Frequency", "Background Tasks"] 
    },
    { 
      label: "BACKUP", 
      icon: Database,
      items: ["Local Backup", "Cloud Sync", "Export Data"] 
    }
  ];

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

      {/* 7. SETTINGS NAVIGATION TABS */}
      <div className="max-w-[1600px] mx-auto px-8 -mt-7 relative z-20">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2 shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-11 px-6 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                ${activeTab === tab ? 'bg-[#111827] text-white shadow-lg' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-8 pt-10 grid grid-cols-12 gap-8 items-start">
        
        {/* 8. LEFT SIDEBAR → SETTINGS CATEGORIES */}
        <aside className="col-span-2 sticky top-24 space-y-8">
          {sidebarCategories.map(cat => (
            <section key={cat.label}>
              <div className="flex items-center gap-2 mb-4">
                <cat.icon size={14} className="text-[#9CA3AF]" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF]">{cat.label}</h3>
              </div>
              <div className="space-y-1">
                {cat.items.map(item => (
                  <button key={item} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-sm transition-all group flex items-center justify-between">
                    {item}
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </aside>

        {/* 9. MAIN CONFIGURATION WORKSPACE */}
        <main className="col-span-7 space-y-8">
          
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Time Zone</label>
                      <select className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none">
                        <option>Asia/Kolkata (GMT+05:30)</option>
                        <option>UTC (GMT+00:00)</option>
                        <option>America/New_York (GMT-05:00)</option>
                        <option>Europe/London (GMT+00:00)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Primary Currency</label>
                      <select className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none">
                        <option>INR (₹)</option>
                        <option>USD ($)</option>
                        <option>EUR (€)</option>
                        <option>GBP (£)</option>
                        <option>AED (د.إ)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Date Format</label>
                      <select className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none">
                        <option>DD/MM/YYYY</option>
                        <option>MM/DD/YYYY</option>
                        <option>YYYY-MM-DD</option>
                        <option>DD-MMM-YYYY</option>
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
                      <h2 className="text-xl font-black tracking-tight">System Autopilot</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Configure intelligent operational workflows and triggers</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {[
                      { id: 'renewalReminders', label: 'Membership Renewal Reminders', desc: 'Auto-send WhatsApp and SMS 3 days before expiry', icon: RefreshCw },
                      { id: 'autoFreeze', label: 'Auto-Freeze Inactive Members', desc: 'Automatically freeze accounts after 15 days of non-attendance', icon: Minimize },
                      { id: 'ptBillingTriggers', label: 'PT Session Billing Triggers', desc: 'Generate invoices immediately after PT session completion', icon: CreditCard },
                      { id: 'leadFollowups', label: 'Lead Management Autopilot', desc: 'Schedule follow-up tasks for staff after new inquiries', icon: UserCheck }
                    ].map(rule => (
                      <div key={rule.id} className="p-6 rounded-2xl border border-[#F3F4F6] hover:border-[#E5E7EB] transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#9CA3AF] group-hover:bg-[#111827] group-hover:text-white transition-all">
                            <rule.icon size={22} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-[#111827] mb-1">{rule.label}</div>
                            <div className="text-[11px] font-bold text-[#6B7280]">{rule.desc}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleInputChange('automation', rule.id, !settings.automation[rule.id])}
                          className={`w-12 h-6 rounded-full transition-all relative ${settings.automation[rule.id] ? 'bg-[#6366F1]' : 'bg-[#E5E7EB]'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.automation[rule.id] ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 p-8 rounded-3xl bg-[#111827] text-white overflow-hidden relative group cursor-pointer">
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
                      <h2 className="text-xl font-black tracking-tight">Security & Infrastructure</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Protect your gym data and control platform access</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-10">
                    <div className="col-span-8 space-y-8">
                      <div className="space-y-6">
                        {[
                          { id: 'twoFactor', label: 'Two-Factor Authentication (2FA)', desc: 'Add an extra layer of security for all admin accounts', icon: Fingerprint },
                          { id: 'deviceControl', label: 'Device Login Control', desc: 'Notify when account is accessed from a new device', icon: Smartphone },
                          { id: 'ipRestriction', label: 'Office IP Restriction', desc: 'Only allow dashboard access from verified static IPs', icon: Lock }
                        ].map(rule => (
                          <div key={rule.id} className="flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#111827] mt-1">
                                <rule.icon size={20} />
                              </div>
                              <div>
                                <div className="text-sm font-black mb-1">{rule.label}</div>
                                <p className="text-[11px] font-bold text-[#6B7280] max-w-sm">{rule.desc}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleInputChange('security', rule.id, !settings.security[rule.id])}
                              className={`w-12 h-6 rounded-full transition-all relative ${settings.security[rule.id] ? 'bg-[#10B981]' : 'bg-[#E5E7EB]'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.security[rule.id] ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="pt-8 border-t border-[#F3F4F6]">
                        <div className="flex items-center justify-between mb-6">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Session Timeout</label>
                          <span className="text-[10px] font-black text-[#111827] uppercase bg-[#F3F4F6] px-2 py-1 rounded-md">{settings.security.sessionTimeout} Minutes</span>
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
                        <div className="flex justify-between mt-2 text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest px-1">
                          <span>5 min</span>
                          <span>60 min</span>
                          <span>120 min</span>
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

            {activeTab === "Integrations" && (
              <motion.div 
                key="integrations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 15. INTEGRATION SETTINGS SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">External Ecosystem</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Connect third-party services and biometric infrastructure</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {[
                      { name: 'WhatsApp API', status: 'Connected', health: 'Healthy', icon: MessageSquare, color: 'text-[#10B981]', bg: 'bg-[#ECFDF5]' },
                      { name: 'Razorpay', status: 'Active', health: 'Healthy', icon: CreditCard, color: 'text-[#3B82F6]', bg: 'bg-[#EFF6FF]' },
                      { name: 'Biometric Access', status: 'Warning', health: 'Sync Latency', icon: Fingerprint, color: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB]' },
                      { name: 'Stripe Global', status: 'Inactive', health: 'Not Linked', icon: Globe, color: 'text-[#9CA3AF]', bg: 'bg-[#F9FAFB]' },
                      { name: 'QR Attendance', status: 'Active', health: 'Healthy', icon: QrCode, color: 'text-[#8B5CF6]', bg: 'bg-[#F5F3FF]' },
                      { name: 'Email SMTP', status: 'Connected', health: 'Healthy', icon: Mail, color: 'text-[#EF4444]', bg: 'bg-[#FEF2F2]' }
                    ].map(integration => (
                      <div key={integration.name} className="p-6 rounded-3xl border border-[#F3F4F6] hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 rounded-2xl ${integration.bg} ${integration.color} flex items-center justify-center`}>
                            <integration.icon size={24} />
                          </div>
                          <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest 
                            ${integration.status === 'Connected' || integration.status === 'Active' ? 'bg-[#10B981]/10 text-[#10B981]' : 
                              integration.status === 'Warning' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#9CA3AF]/10 text-[#9CA3AF]'}`}>
                            {integration.status}
                          </div>
                        </div>
                        <h4 className="text-sm font-black mb-1">{integration.name}</h4>
                        <p className="text-[10px] font-bold text-[#9CA3AF] mb-6">{integration.health}</p>
                        <button className="w-full h-9 rounded-xl bg-[#F3F4F6] text-[10px] font-black uppercase tracking-widest hover:bg-[#111827] hover:text-white transition-all">
                          Configure
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Performance" && (
              <motion.div 
                key="performance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 16. PERFORMANCE SETTINGS SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Cpu size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">System Optimization</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Tune platform responsiveness and data processing</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Cache Management</label>
                        <div className="grid grid-cols-3 gap-3 p-1 bg-[#F3F4F6] rounded-2xl">
                          {['None', 'Balanced', 'Aggressive'].map(c => (
                            <button 
                              key={c}
                              onClick={() => handleInputChange('performance', 'cacheManagement', c.toLowerCase())}
                              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                ${settings.performance.cacheManagement === c.toLowerCase() ? 'bg-white text-[#111827] shadow-sm' : 'text-[#9CA3AF] hover:text-[#4B5563]'}`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Data Sync Frequency</label>
                        <select className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none">
                          <option>Real-time Sync</option>
                          <option>Every 5 Minutes</option>
                          <option>Every 30 Minutes</option>
                          <option>Daily at Midnight</option>
                        </select>
                      </div>

                      <div className="p-6 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#111827] shadow-sm">
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-black mb-0.5">Image Optimization</div>
                            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Active</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleInputChange('performance', 'imageOptimization', !settings.performance.imageOptimization)}
                          className={`w-12 h-6 rounded-full transition-all relative ${settings.performance.imageOptimization ? 'bg-[#111827]' : 'bg-[#E5E7EB]'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.performance.imageOptimization ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-[#111827] rounded-3xl p-8 text-white">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Performance Monitor</h4>
                        <div className="flex items-center gap-1.5 text-[#10B981]">
                          <Activity size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Optimal</span>
                        </div>
                      </div>
                      
                      <div className="space-y-8">
                        {[
                          { label: 'Memory Usage', value: '42%', color: 'bg-blue-500' },
                          { label: 'CPU Load', value: '18%', color: 'bg-green-500' },
                          { label: 'DB Latency', value: '12ms', color: 'bg-purple-500' }
                        ].map(stat => (
                          <div key={stat.label} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-white/60">{stat.label}</span>
                              <span className="text-[11px] font-black">{stat.value}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full ${stat.color} rounded-full`} style={{ width: stat.value.includes('%') ? stat.value : '20%' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-10 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div className="text-[9px] font-black uppercase tracking-widest text-white/40">Engine Uptime</div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-[#10B981]">1,428 Hours</div>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Data & Backup" && (
              <motion.div 
                key="backup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 17. DATA & BACKUP SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Database size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Data Management & Resilience</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Safeguard your gym records with automated backups</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="p-8 rounded-3xl bg-[#F9FAFB] border border-[#E5E7EB] group hover:border-[#111827] transition-all">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#111827] shadow-sm border border-[#F3F4F6] group-hover:bg-[#111827] group-hover:text-white transition-all">
                            <HardDrive size={28} />
                          </div>
                          <div>
                            <h4 className="text-lg font-black tracking-tight">Cloud Sync & Backup</h4>
                            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">AWS Enterprise S3</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-4 border-y border-[#F3F4F6] mb-6">
                          <span className="text-xs font-bold text-[#6B7280]">Last Backup</span>
                          <span className="text-xs font-black text-[#111827]">Today, 11:42 PM</span>
                        </div>
                        <div className="flex gap-3">
                          <button className="flex-1 h-11 rounded-xl bg-[#111827] text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">Backup Now</button>
                          <button className="h-11 px-4 rounded-xl border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-all">
                            <RotateCcw size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button className="p-6 rounded-3xl border border-[#F3F4F6] hover:border-[#E5E7EB] text-center transition-all group">
                          <Download size={24} className="mx-auto mb-3 text-[#9CA3AF] group-hover:text-[#111827] transition-all" />
                          <div className="text-[10px] font-black uppercase tracking-widest">Export All</div>
                        </button>
                        <button className="p-6 rounded-3xl border border-[#F3F4F6] hover:border-[#E5E7EB] text-center transition-all group">
                          <Upload size={24} className="mx-auto mb-3 text-[#9CA3AF] group-hover:text-[#111827] transition-all" />
                          <div className="text-[10px] font-black uppercase tracking-widest">Restore Data</div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-6 ml-2">Backup Schedule</h4>
                        <div className="space-y-4">
                          {[
                            { day: 'Monday', time: '02:00 AM', status: 'Success' },
                            { day: 'Tuesday', time: '02:00 AM', status: 'Success' },
                            { day: 'Wednesday', time: '02:00 AM', status: 'Success' },
                            { day: 'Thursday', time: '02:00 AM', status: 'Scheduled' }
                          ].map(log => (
                            <div key={log.day} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F9FAFB] transition-all">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${log.status === 'Success' ? 'bg-[#10B981]' : 'bg-[#9CA3AF]'}`} />
                                <span className="text-xs font-bold text-[#111827]">{log.day}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[11px] font-bold text-[#6B7280]">{log.time}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${log.status === 'Success' ? 'text-[#10B981]' : 'text-[#9CA3AF]'}`}>{log.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button className="w-full mt-8 h-10 rounded-xl bg-white border border-[#E5E7EB] text-[10px] font-black uppercase tracking-widest hover:bg-[#F3F4F6] transition-all">
                          Configure Schedule
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Advanced" && (
              <motion.div 
                key="advanced"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 18. ADVANCED SETTINGS SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Code size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Developer & System Core</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Low-level platform controls and experimental features</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="p-8 rounded-3xl bg-[#111827] text-white flex items-center justify-between group">
                      <div className="flex gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/10 group-hover:bg-[#6366F1] transition-all">
                          <Terminal size={28} />
                        </div>
                        <div>
                          <h4 className="text-lg font-black mb-1">Developer Mode</h4>
                          <p className="text-[11px] font-bold text-white/40 max-w-sm">Enable API access, webhook logs, and experimental feature flags.</p>
                        </div>
                      </div>
                      <button className="h-11 px-8 rounded-2xl bg-white text-[#111827] text-[10px] font-black uppercase tracking-widest hover:bg-[#6366F1] hover:text-white transition-all">Enable Mode</button>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="p-6 rounded-3xl border border-[#F3F4F6] hover:border-[#E5E7EB] transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <Database size={18} className="text-[#9CA3AF]" />
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-[#111827]">Database Explorer</h5>
                        </div>
                        <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed mb-6">Inspect local database schemas and collection health.</p>
                        <button className="text-[9px] font-black uppercase tracking-widest text-[#111827] underline underline-offset-4">Open Explorer</button>
                      </div>
                      <div className="p-6 rounded-3xl border border-[#F3F4F6] hover:border-[#E5E7EB] transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <RefreshCw size={18} className="text-[#9CA3AF]" />
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-[#111827]">Offline Engine</h5>
                        </div>
                        <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed mb-6">Configure IndexedDB persistence and sync resolution strategies.</p>
                        <button className="text-[9px] font-black uppercase tracking-widest text-[#111827] underline underline-offset-4">Configure Engine</button>
                      </div>
                    </div>

                    <div className="mt-10 p-8 rounded-3xl border-2 border-dashed border-[#FEE2E2] bg-[#FFF5F5]">
                      <div className="flex items-center gap-4 mb-4">
                        <AlertTriangle className="text-[#EF4444]" size={24} />
                        <h4 className="text-sm font-black text-[#B91C1C] uppercase tracking-tight">Danger Zone</h4>
                      </div>
                      <p className="text-[11px] font-bold text-[#B91C1C]/70 mb-8 max-w-xl">
                        Actions in this section can cause permanent data loss or system instability. 
                        Only authorized personnel should access these controls.
                      </p>
                      <div className="flex gap-4">
                        <button className="h-10 px-6 rounded-xl bg-[#EF4444] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#DC2626] transition-all">Factory Reset</button>
                        <button className="h-10 px-6 rounded-xl border border-[#FEE2E2] bg-white text-[#B91C1C] text-[10px] font-black uppercase tracking-widest hover:bg-[#FEE2E2] transition-all">Purge Cache</button>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 19. RIGHT SIDE FLOATING INSIGHT PANEL */}
        <aside className="col-span-3 sticky top-24 space-y-8">
          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">System Intelligence</h3>
              <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#6366F1]">
                <Sparkles size={16} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#F3F4F6]">
                <div className="flex gap-3 mb-2">
                  <BarChart3 size={16} className="text-[#10B981]" />
                  <p className="text-[11px] font-black text-[#111827]">Performance Score</p>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-black text-[#111827]">98</span>
                  <span className="text-xs font-bold text-[#10B981] mb-1">/ 100</span>
                </div>
                <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed">
                  Your platform is currently optimized for maximum responsiveness.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#F5F3FF] border border-[#EDE9FE]">
                <div className="flex gap-3 mb-2">
                  <ShieldCheck size={16} className="text-[#6366F1]" />
                  <p className="text-[11px] font-black text-[#111827]">Security Grade</p>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-black text-[#111827]">A+</span>
                  <span className="text-xs font-bold text-[#6366F1] mb-1">Enterprise</span>
                </div>
                <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed">
                  Enabling 2FA would increase your security score by 12 points.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[#111827] text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={14} className="text-[#6366F1]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">AI Recommendation</span>
                </div>
                <p className="text-[11px] font-bold leading-relaxed text-white/80">
                  "Enabling automated WhatsApp reminders can improve member renewal rates by 24% based on similar gym profiles."
                </p>
                <button className="mt-4 text-[9px] font-black uppercase tracking-widest text-[#6366F1] hover:text-white transition-all underline underline-offset-4">Apply Auto-Fix</button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF] mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {[
                { action: 'Theme changed', time: '2 mins ago', user: 'Admin' },
                { action: 'WhatsApp API sync', time: '1 hour ago', user: 'System' },
                { action: 'Backup successful', time: '2 hours ago', user: 'Engine' }
              ].map((log, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB] mt-1.5 group-hover:bg-[#111827] transition-all" />
                  <div>
                    <div className="text-[11px] font-black text-[#111827] mb-0.5">{log.action}</div>
                    <div className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                      {log.time} • {log.user}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 h-10 rounded-xl bg-[#F3F4F6] text-[10px] font-black uppercase tracking-widest hover:bg-[#111827] hover:text-white transition-all">
              View Audit Logs
            </button>
          </section>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
            <div className="relative z-10">
              <HelpCircle className="mb-4 opacity-60" size={28} />
              <h4 className="text-sm font-black mb-2 uppercase tracking-tight">Need Assistance?</h4>
              <p className="text-[11px] font-semibold opacity-80 leading-relaxed mb-6">
                Our infrastructure experts are available 24/7 to help you configure your platform.
              </p>
              <button className="h-10 px-6 rounded-xl bg-white text-[#111827] text-[10px] font-black uppercase tracking-widest hover:bg-[#111827] hover:text-white transition-all">
                Contact Support
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          </div>
        </aside>
      </div>

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
