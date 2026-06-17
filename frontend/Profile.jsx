import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Shield, 
  Bell, 
  Smartphone, 
  Activity, 
  ChevronRight, 
  Search, 
  Camera, 
  Lock, 
  Fingerprint, 
  Eye, 
  EyeOff, 
  Globe, 
  Layout, 
  Zap, 
  History, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  MoreHorizontal, 
  Download, 
  Upload, 
  LogOut, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Sparkles,
  BarChart3,
  ShieldCheck,
  Smartphone as DeviceIcon,
  Laptop,
  Terminal,
  ArrowRight
} from "lucide-react";

/**
 * GYMDECK • PERSONAL IDENTITY & ACCOUNT CONTROL CENTER
 * Enterprise Production-Grade User Profile Infrastructure
 */

const Profile = () => {
  const [activeTab, setActiveTab] = useState("General");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // --- MOCK PROFILE STATE ---
  const [userData, setUserData] = useState({
    fullName: "Subham Das",
    username: "subham_das_hq",
    email: "subham@gymdeck.io",
    phone: "+91 98765 43210",
    dob: "1995-08-15",
    gender: "Male",
    bio: "Operations-focused fitness infrastructure builder. Scaling GymDeck to new horizons.",
    role: "Super Admin",
    department: "Executive Operations",
    branch: "Kolkata HQ",
    employeeId: "GD-E-001",
    joinedDate: "12 May 2024",
    theme: "system",
    density: "comfortable",
    notifications: {
      push: true,
      whatsapp: true,
      email: true,
      attendance: true,
      payments: true
    }
  });

  const tabs = [
    "General", "Professional", "Security", "Preferences", 
    "Notifications", "Devices", "Activity", "Advanced"
  ];

  const sidebarCategories = [
    { 
      label: "GENERAL", 
      icon: User,
      items: ["Basic Information", "Contact Info", "Personal Bio"] 
    },
    { 
      label: "PROFESSIONAL", 
      icon: Briefcase,
      items: ["Role & Permissions", "Department", "Branch Access"] 
    },
    { 
      label: "SECURITY", 
      icon: Shield,
      items: ["Password", "2FA", "Sessions"] 
    },
    { 
      label: "PERSONALIZATION", 
      icon: Layout,
      items: ["Theme", "Layout Density", "Language"] 
    }
  ];

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
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
    <div className="profile-workspace bg-[#F8FAFC] min-h-full font-['Plus_Jakarta_Sans'] text-[#111827] pb-24">
      
      {/* 5. TOP UTILITY HEADER */}
      <header className="sticky top-0 z-[100] h-16 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            <span>Account</span>
            <ChevronRight size={14} className="mx-2" />
            <span className="text-[#111827]">My Profile</span>
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input 
              type="text" 
              placeholder="Search profile settings, security, devices, activity..."
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
            <Shield size={18} />
            Security Center
          </button>
          <button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`h-10 px-6 rounded-lg text-sm font-bold transition-all shadow-lg shadow-black/10 flex items-center gap-2
              ${hasChanges ? 'bg-[#111827] text-white hover:bg-[#1F2937]' : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed shadow-none'}`}
          >
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      {/* 6. PROFILE HERO SECTION */}
      <section className="relative h-[280px] w-full overflow-hidden bg-white border-b border-[#E5E7EB]">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4" />
        </div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto h-full px-8 flex items-center justify-between">
          <div className="flex items-center gap-10">
            {/* PROFILE IMAGE */}
            <div className="relative group">
              <div className="w-44 h-44 rounded-[32px] bg-[#111827] flex items-center justify-center text-5xl font-black text-white overflow-hidden shadow-2xl border-4 border-white">
                {userData.fullName.split(' ').map(n => n[0]).join('')}
              </div>
              <button className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-white shadow-xl border border-[#E5E7EB] flex items-center justify-center text-[#111827] hover:bg-[#F3F4F6] transition-all">
                <Camera size={20} />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="px-3 py-1 bg-[#111827] rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  Super Admin
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[10px] font-bold text-emerald-600">
                  <CheckCircle2 size={12} />
                  Verified Account
                </div>
              </div>
              <h1 className="text-[52px] font-black text-[#111827] leading-none tracking-tight mb-2">
                {userData.fullName}
              </h1>
              <p className="text-[#6B7280] text-lg font-semibold flex items-center gap-3">
                {userData.role} <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" /> {userData.branch}
              </p>
              
              <div className="mt-6 flex items-center gap-6">
                <div className="flex items-center gap-2 text-[#9CA3AF]">
                  <Calendar size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-widest">Joined {userData.joinedDate}</span>
                </div>
                <div className="flex items-center gap-2 text-[#9CA3AF]">
                  <Globe size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-widest">UTC +05:30</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 min-w-[180px] shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                <Zap size={20} />
              </div>
              <div className="text-2xl font-black text-[#111827]">124</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">Tasks Handled</div>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 min-w-[180px] shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                <ShieldCheck size={20} />
              </div>
              <div className="text-2xl font-black text-[#111827]">98%</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF]">Security Score</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PROFILE NAVIGATION TABS */}
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
        
        {/* 8. LEFT SIDEBAR → CATEGORIES */}
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

        {/* 9. MAIN PROFILE WORKSPACE */}
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
                {/* 10. GENERAL INFORMATION SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Basic Information</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Update your public identity and contact details</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Full Name</label>
                      <input 
                        type="text" 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] transition-all"
                        value={userData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Username</label>
                      <input 
                        type="text" 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] transition-all"
                        value={userData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Email Address</label>
                      <div className="relative">
                        <input 
                          type="email" 
                          className="w-full h-12 px-5 pr-24 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] transition-all"
                          value={userData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-md">Verified</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Phone Number</label>
                      <input 
                        type="tel" 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] transition-all"
                        value={userData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Date of Birth</label>
                      <input 
                        type="date" 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] transition-all"
                        value={userData.dob}
                        onChange={(e) => handleInputChange('dob', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Gender</label>
                      <select 
                        className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] appearance-none"
                        value={userData.gender}
                        onChange={(e) => handleInputChange('gender', e.target.value)}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                        <option>Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-8 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Personal Bio</label>
                    <textarea 
                      className="w-full h-32 p-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-3xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] transition-all resize-none"
                      value={userData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                    />
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Professional" && (
              <motion.div 
                key="professional"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 11. PROFESSIONAL INFORMATION SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Professional Identity</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Manage your role, branch and department assignments</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="p-6 rounded-3xl bg-[#F9FAFB] border border-[#E5E7EB]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-4">Current Assignment</div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#6B7280]">Operational Role</span>
                            <span className="text-xs font-black text-[#111827]">{userData.role}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#6B7280]">Department</span>
                            <span className="text-xs font-black text-[#111827]">{userData.department}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#6B7280]">Primary Branch</span>
                            <span className="text-xs font-black text-[#111827]">{userData.branch}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#6B7280]">Employee ID</span>
                            <span className="text-xs font-black text-[#111827]">{userData.employeeId}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl bg-[#111827] text-white">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Access Privileges</h4>
                        <div className="space-y-3">
                          {['System Infrastructure', 'Financial Reports', 'Staff Management', 'Member Data'].map(perm => (
                            <div key={perm} className="flex items-center gap-3">
                              <CheckCircle2 size={14} className="text-indigo-400" />
                              <span className="text-xs font-bold">{perm}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-indigo-50/30 rounded-3xl p-8 border border-indigo-100">
                        <h4 className="text-sm font-black mb-4 flex items-center gap-2">
                          <Sparkles size={18} className="text-indigo-600" />
                          Multi-Branch Access
                        </h4>
                        <p className="text-xs font-bold text-indigo-900/60 leading-relaxed mb-6">
                          You have been granted access to oversee multiple branch operations. You can switch branches from the top navigation bar.
                        </p>
                        <div className="space-y-2">
                          {['Kolkata HQ', 'New Delhi North', 'Bangalore Central'].map(b => (
                            <div key={b} className="px-4 py-3 bg-white rounded-xl text-xs font-black border border-indigo-100 flex items-center justify-between">
                              {b}
                              <ChevronRight size={14} className="text-indigo-300" />
                            </div>
                          ))}
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 13. SECURITY CENTER */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Security & Infrastructure</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Protect your account and manage active sessions</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center justify-between p-8 rounded-3xl bg-[#F9FAFB] border border-[#E5E7EB] group hover:border-[#111827] transition-all">
                      <div className="flex gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#111827] shadow-sm border border-[#F3F4F6] group-hover:bg-[#111827] group-hover:text-white transition-all">
                          <Lock size={28} />
                        </div>
                        <div>
                          <h4 className="text-lg font-black mb-1">Account Password</h4>
                          <p className="text-xs font-bold text-[#9CA3AF] max-w-sm">Last changed 42 days ago. Strong passwords improve security.</p>
                        </div>
                      </div>
                      <button className="h-11 px-8 rounded-2xl border border-[#E5E7EB] bg-white text-[10px] font-black uppercase tracking-widest hover:bg-[#111827] hover:text-white transition-all">Update Password</button>
                    </div>

                    <div className="flex items-center justify-between p-8 rounded-3xl bg-[#F9FAFB] border border-[#E5E7EB] group hover:border-[#111827] transition-all">
                      <div className="flex gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#111827] shadow-sm border border-[#F3F4F6] group-hover:bg-[#6366F1] group-hover:text-white transition-all">
                          <Fingerprint size={28} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-black">Two-Factor Authentication</h4>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest">Recommended</span>
                          </div>
                          <p className="text-xs font-bold text-[#9CA3AF] max-w-sm">Add an extra layer of security using an authenticator app.</p>
                        </div>
                      </div>
                      <button className="h-11 px-8 rounded-2xl bg-[#6366F1] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#4F46E5] transition-all shadow-lg shadow-indigo-500/20">Enable 2FA</button>
                    </div>
                  </div>

                  <div className="mt-12 pt-10 border-t border-[#F3F4F6]">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-8 ml-2">Active Login Sessions</h3>
                    <div className="space-y-4">
                      {[
                        { device: 'MacBook Pro 16"', os: 'macOS 14.2', location: 'Kolkata, India', browser: 'Chrome 124', current: true },
                        { device: 'iPhone 15 Pro', os: 'iOS 17.4', location: 'Kolkata, India', browser: 'GymDeck Mobile', current: false },
                        { device: 'iPad Pro M2', os: 'iPadOS 17.4', location: 'New Delhi, India', browser: 'Safari 17.4', current: false }
                      ].map((session, i) => (
                        <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-white border border-[#E5E7EB] hover:shadow-md transition-all">
                          <div className="flex gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.current ? 'bg-indigo-50 text-indigo-600' : 'bg-[#F9FAFB] text-[#9CA3AF]'}`}>
                              {session.device.includes('iPhone') ? <Smartphone size={24} /> : <Laptop size={24} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h5 className="text-sm font-black">{session.device}</h5>
                                {session.current && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest">Active Now</span>}
                              </div>
                              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">
                                {session.os} • {session.browser} • {session.location}
                              </p>
                            </div>
                          </div>
                          {!session.current && (
                            <button className="text-[10px] font-black text-[#EF4444] uppercase tracking-widest hover:underline transition-all">Revoke</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === "Activity" && (
              <motion.div 
                key="activity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* 16. ACTIVITY TIMELINE SECTION */}
                <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                      <Activity size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Activity Timeline</h2>
                      <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Monitor your operational actions and account history</p>
                    </div>
                  </div>

                  <div className="relative pl-8 space-y-10 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-[#E5E7EB]">
                    {[
                      { action: 'Updated membership plan for member #A102', time: '10 mins ago', type: 'operation', icon: Zap },
                      { action: 'Generated quarterly revenue report (PDF)', time: '2 hours ago', type: 'report', icon: Download },
                      { action: 'Security check: New login from macOS device', time: 'Yesterday, 11:42 PM', type: 'security', icon: Shield },
                      { action: 'Updated primary branch settings for South Delhi', time: 'Yesterday, 04:30 PM', type: 'operation', icon: Globe },
                      { action: 'Assigned new staff role: Front Desk (Priya S.)', time: '21 May 2024', type: 'staff', icon: User }
                    ].map((log, i) => (
                      <div key={i} className="relative group">
                        <div className="absolute -left-[37px] top-1 w-[11px] h-[11px] rounded-full bg-white border-2 border-[#111827] z-10 group-hover:scale-125 transition-all" />
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">{log.time}</span>
                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest 
                              ${log.type === 'security' ? 'bg-amber-50 text-amber-600' : 'bg-[#F3F4F6] text-[#4B5563]'}`}>
                              {log.type}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#111827] shadow-sm">
                              <log.icon size={18} />
                            </div>
                            <h5 className="text-sm font-bold text-[#111827]">{log.action}</h5>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="w-full mt-12 h-12 rounded-2xl bg-[#F3F4F6] text-[10px] font-black uppercase tracking-widest hover:bg-[#111827] hover:text-white transition-all">
                    Load Full History
                  </button>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 17. RIGHT SIDE FLOATING INSIGHT PANEL */}
        <aside className="col-span-3 sticky top-24 space-y-8">
          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">Account Health</h3>
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Sparkles size={16} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#F3F4F6]">
                <div className="flex gap-3 mb-2">
                  <BarChart3 size={16} className="text-[#10B981]" />
                  <p className="text-[11px] font-black text-[#111827]">Profile Completeness</p>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-black text-[#111827]">85</span>
                  <span className="text-xs font-bold text-[#10B981] mb-1">%</span>
                </div>
                <div className="h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] rounded-full" style={{ width: '85%' }} />
                </div>
                <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed mt-3">
                  Complete your professional experience to reach 100%.
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
                  2FA is currently active. Your account is fully protected.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[#111827] text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-[#6366F1]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">AI Insight</span>
                </div>
                <p className="text-[11px] font-bold leading-relaxed text-white/80">
                  "Profiles with completed professional info improve operational accountability by 32%."
                </p>
                <button className="mt-4 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-all underline underline-offset-4">Complete Profile</button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF] mb-6">Recent Edits</h3>
            <div className="space-y-6">
              {[
                { field: 'Professional Bio', time: '2 hours ago' },
                { field: 'Email Address', time: '3 days ago' },
                { field: 'Profile Picture', time: '12 days ago' }
              ].map((edit, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E5E7EB] mt-1.5 group-hover:bg-[#111827] transition-all" />
                  <div>
                    <div className="text-[11px] font-black text-[#111827] mb-0.5">{edit.field}</div>
                    <div className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-widest">{edit.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#111827] to-[#1F2937] text-white relative overflow-hidden shadow-xl shadow-black/10">
            <div className="relative z-10">
              <HelpCircle className="mb-4 text-[#6366F1]" size={28} />
              <h4 className="text-sm font-black mb-2 uppercase tracking-tight">Need Assistance?</h4>
              <p className="text-[11px] font-semibold opacity-60 leading-relaxed mb-6">
                Our support team can help with account recovery and identity verification.
              </p>
              <button className="h-10 px-6 rounded-xl bg-white text-[#111827] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                Contact Support
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
          </div>
        </aside>
      </div>

      {/* 18. STICKY BOTTOM SAVE BAR */}
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
                <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white animate-pulse">
                  <Activity size={20} />
                </div>
                <div>
                  <div className="text-xs font-black text-white leading-none mb-1">Unsaved Profile Changes</div>
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">Modified {activeTab} information</div>
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
                  className="h-12 px-8 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {isSaving ? "Applying..." : "Save Changes"}
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
export function mountProfile(container) {
  const root = createRoot(container);
  root.render(<Profile />);
}

export default Profile;
