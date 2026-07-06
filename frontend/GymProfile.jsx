import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
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
  QrCode
} from "lucide-react";

/**
 * GYMDECK • GYM PROFILE & OPERATIONAL CONFIGURATION
 * Enterprise Production-Grade Gym Identity System
 */

const GymProfile = () => {
  const [activeTab, setActiveTab] = useState("General");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mock State for Gym Identity
  const [gymData, setGymData] = useState({
    name: "IRON TEMPLE FITNESS",
    tagline: "Strength • Discipline • Transformation",
    description: "Iron Temple Fitness is a premium strength and conditioning facility dedicated to providing high-performance coaching and state-of-the-art equipment to help you achieve your ultimate transformation.",
    foundedYear: "2018",
    businessType: "Commercial Gym",
    primaryPhone: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    email: "ops@irontemple.fit",
    website: "www.irontemple.fit",
    address: "12, 80 Feet Rd, 4th Block, Koramangala",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    gst: "29AAAAA0000A1Z5",
    regNo: "REG-2018-0452",
    openingHours: "06:00 AM",
    closingHours: "10:00 PM",
    socials: {
      instagram: "@irontemple_fit",
      facebook: "IronTempleFitness",
      youtube: "IronTempleTV",
      twitter: "IronTempleX"
    }
  });

  const tabs = [
    "General", "Branding", "Business Information", "Branches", 
    "Operational Settings", "Social Media", "Public Profile", 
    "Verification", "Advanced"
  ];

  const sidebarCategories = [
    { label: "GENERAL", items: ["Basic Information", "Contact Details", "Description"] },
    { label: "BRANDING", items: ["Logo", "Cover Image", "Brand Colors", "Typography"] },
    { label: "BUSINESS", items: ["GST Details", "Registration Number", "Legal Information"] },
    { label: "OPERATIONS", items: ["Opening Hours", "Membership Capacity", "Time Slots"] },
    { label: "DIGITAL", items: ["Website", "App Links", "QR Codes"] },
    { label: "SECURITY", items: ["Verification", "Access Permissions", "Public Visibility"] }
  ];

  const handleInputChange = (field, value) => {
    setGymData(prev => ({ ...prev, [field]: value }));
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
    <div className="gym-profile-workspace bg-[#F8FAFC] min-h-full font-['Plus_Jakarta_Sans'] text-[#111827] pb-24">
      
      {/* 5. TOP UTILITY HEADER */}
      <header className="sticky top-0 z-[100] h-16 bg-white backdrop-blur-md border-b border-[#E5E7EB] px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            <span>Settings</span>
            <ChevronRight size={14} className="mx-2" />
            <span className="text-[#111827]">Gym Profile</span>
          </nav>
        </div>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input 
              type="text" 
              placeholder="Search settings, branding, branches..."
              className="w-full h-10 pl-10 pr-4 bg-[#F3F4F6] border-none rounded-full text-sm focus:ring-2 focus:ring-[#111827] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-bold flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors text-[#4B5563]">
            <Eye size={18} />
            Preview Public Profile
          </button>
          <button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`h-10 px-6 rounded-lg text-sm font-bold transition-all shadow-lg shadow-black/10 flex items-center gap-2
              ${hasChanges ? 'bg-[#111827] text-white hover:bg-[#1F2937]' : 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed shadow-none'}`}
          >
            {isSaving ? <Activity size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      {/* 6. GYM IDENTITY HERO SECTION */}
      <section className="relative h-[280px] w-full overflow-hidden bg-[#111827]">
        <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center grayscale" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111827] via-[#111827]/80 to-transparent" />
        
        <div className="relative z-10 max-w-[1600px] mx-auto h-full px-8 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo Area */}
            <div className="relative group">
              <div className="w-40 h-40 rounded-3xl bg-white p-2 shadow-2xl border-4 border-white/20">
                <div className="w-full h-full rounded-2xl bg-[#111827] flex items-center justify-center text-white overflow-hidden relative">
                  <Building2 size={64} />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Upload size={24} />
                  </div>
                </div>
              </div>
              <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-[#111827] border border-[#E5E7EB]">
                <Edit3 size={16} />
              </button>
            </div>

            {/* Gym Name & Tagline */}
            <div>
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-[48px] font-black text-white leading-none tracking-tight">{gymData.name}</h1>
                <BadgeCheck className="text-[#6366F1]" size={32} />
              </div>
              <p className="text-xl font-bold text-white/60 mb-6 italic tracking-wide">{gymData.tagline}</p>
              
              <div className="flex gap-2">
                {["Verified Gym", "Multi-Branch", "Premium Facility", "PT Certified"].map(badge => (
                  <span key={badge} className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex gap-4">
            {[
              { label: "Members", value: "428", icon: Users },
              { label: "Trainers", value: "24", icon: Zap },
              { label: "Branches", value: "03", icon: MapPin }
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 min-w-[120px] text-white">
                <stat.icon size={16} className="mb-2 opacity-60" />
                <div className="text-2xl font-black">{stat.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-widest opacity-40">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. SETTINGS NAVIGATION TABS */}
      <div className="max-w-[1600px] mx-auto px-8 -mt-7 relative z-20">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-10 px-5 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                  ${activeTab === tab ? 'bg-[#111827] text-white shadow-lg' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button className="h-10 w-10 flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] rounded-xl transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-8 pt-10 grid grid-cols-12 gap-8 items-start">
        
        {/* 8. LEFT SIDEBAR → SETTINGS CATEGORIES */}
        <aside className="col-span-2 sticky top-24 space-y-8">
          {sidebarCategories.map(cat => (
            <section key={cat.label}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#9CA3AF] mb-4">{cat.label}</h3>
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
          
          <div className="p-6 rounded-2xl bg-[#6366F1] text-white relative overflow-hidden">
            <div className="relative z-10">
              <BadgeCheck className="mb-4" size={28} />
              <h4 className="text-sm font-black mb-2">Enterprise Ready</h4>
              <p className="text-[11px] font-semibold opacity-80 leading-relaxed mb-4">
                Your profile is 100% compliant with GymDeck quality standards.
              </p>
              <button className="text-[10px] font-black uppercase tracking-widest underline underline-offset-4">
                Export Certificate
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          </div>
        </aside>

        {/* 9. MAIN CONFIGURATION WORKSPACE */}
        <main className="col-span-7 space-y-8">
          
          {/* 10. GENERAL INFORMATION SECTION */}
          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">General Information</h2>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Base Identity & Institutional Details</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Gym Name</label>
                <input 
                  type="text" 
                  value={gymData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Tagline / Motto</label>
                <input 
                  type="text" 
                  value={gymData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Description</label>
                <textarea 
                  rows={4}
                  value={gymData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full p-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Founded Year</label>
                <input 
                  type="text" 
                  value={gymData.foundedYear}
                  className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Business Type</label>
                <select className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#111827] focus:border-transparent transition-all appearance-none">
                  {["Commercial Gym", "Boutique Studio", "CrossFit", "MMA", "Yoga Studio"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* 11. CONTACT INFORMATION SECTION */}
          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                <Phone size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Contact Information</h2>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Operational Communication & Support</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Primary Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input type="text" value={gymData.primaryPhone} className="w-full h-12 pl-12 pr-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">WhatsApp Number</label>
                <div className="relative">
                  <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#10B981]" />
                  <input type="text" value={gymData.whatsapp} className="w-full h-12 pl-12 pr-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Support Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input type="text" value={gymData.email} className="w-full h-12 pl-12 pr-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Website URL</label>
                <div className="relative">
                  <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input type="text" value={gymData.website} className="w-full h-12 pl-12 pr-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                </div>
              </div>
            </div>

            <div className="mt-10 pt-10 border-t border-[#F3F4F6]">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                  <MapPin size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Location Hub</h2>
                  <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Global Positioning & Branch Mapping</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Address</label>
                  <input type="text" value={gymData.address} className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">City</label>
                  <input type="text" value={gymData.city} className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">ZIP / Pincode</label>
                  <input type="text" value={gymData.pincode} className="w-full h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                </div>
              </div>
              
              <div className="mt-6 h-[200px] w-full rounded-2xl bg-[#F3F4F6] overflow-hidden relative border border-[#E5E7EB]">
               <div className="absolute inset-0 bg-gray-100" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center text-white shadow-2xl animate-bounce">
                    <MapPin size={20} />
                  </div>
                </div>
                <button className="absolute bottom-4 right-4 h-9 px-4 bg-white rounded-lg text-[10px] font-black uppercase tracking-widest text-[#111827] shadow-lg border border-[#E5E7EB]">
                  Sync with GPS
                </button>
              </div>
            </div>
          </section>

          {/* 14. OPERATIONAL SETTINGS SECTION */}
          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                <Clock size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Operational Configuration</h2>
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-widest">Timing, Capacity & Slot Management</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Opening Hours</label>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Closing Hours</label>
                </div>
                <div className="flex items-center gap-4">
                  <input type="time" value="06:00" className="flex-1 h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                  <ChevronRight size={16} className="text-[#D1D5DB]" />
                  <input type="time" value="22:00" className="flex-1 h-12 px-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] ml-2">Max Capacity per Slot</label>
                <div className="relative">
                  <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input type="number" defaultValue="50" className="w-full h-12 pl-12 pr-5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl text-sm font-bold" />
                </div>
              </div>
            </div>
            
            <div className="mt-10 p-6 rounded-2xl border-2 border-dashed border-[#E5E7EB] flex flex-col items-center text-center">
              <Activity className="text-[#D1D5DB] mb-3" size={32} />
              <h4 className="text-sm font-black text-[#4B5563] mb-1">Time Slot Scheduler</h4>
              <p className="text-[11px] font-bold text-[#9CA3AF] max-w-xs mb-4">
                Define peak-hour constraints and trainer-specific availability slots.
              </p>
              <button className="h-9 px-6 rounded-xl bg-[#F3F4F6] text-[10px] font-black uppercase tracking-widest text-[#111827] hover:bg-[#E5E7EB] transition-all">
                Configure Slots
              </button>
            </div>
          </section>
        </main>

        {/* 19. RIGHT SIDE FLOATING PREVIEW PANEL */}
        <aside className="col-span-3 sticky top-24 space-y-8">
          <div className="bg-[#111827] rounded-3xl p-2 shadow-2xl overflow-hidden group">
            <div className="bg-white rounded-[20px] overflow-hidden">
              {/* Header Mockup */}
              <div className="relative h-40 w-full">
                <div className="absolute inset-0 bg-[#F3F4F6] bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop')] bg-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-4 left-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white p-0.5 shadow-xl">
                    <div className="w-full h-full rounded-[10px] bg-[#111827] flex items-center justify-center text-white">
                      <Building2 size={24} />
                    </div>
                  </div>
                  <div className="text-white">
                    <div className="text-sm font-black leading-none mb-1">{gymData.name}</div>
                    <div className="text-[8px] font-bold opacity-60 uppercase tracking-widest leading-none italic">{gymData.tagline}</div>
                  </div>
                </div>
              </div>
              {/* Content Mockup */}
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">Publicly Active</span>
                </div>
                <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed line-clamp-2">
                  {gymData.description}
                </p>
                <div className="flex items-center justify-between py-3 border-y border-[#F3F4F6]">
                  <div className="flex gap-1.5">
                    <Instagram size={14} className="text-[#E1306C]" />
                    <Facebook size={14} className="text-[#1877F2]" />
                    <Youtube size={14} className="text-[#FF0000]" />
                  </div>
                  <div className="flex items-center gap-1">
                    <BadgeCheck size={12} className="text-[#6366F1]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#111827]">Indiranagar</span>
                  </div>
                </div>
                <button className="w-full h-10 rounded-xl bg-[#111827] text-white text-[10px] font-black uppercase tracking-widest group-hover:bg-[#6366F1] transition-all">
                  Visit Landing Page
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between text-white/40 text-[9px] font-bold uppercase tracking-widest">
              <span>Live Public Preview</span>
              <Smartphone size={14} />
            </div>
          </div>

          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">AI Brand Score</h3>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F5F3FF] text-[#6366F1] rounded-full text-[10px] font-black">
                <Activity size={12} />
                94%
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#F3F4F6]">
                <div className="flex gap-3 mb-2">
                  <BadgeCheck size={16} className="text-[#10B981]" />
                  <p className="text-[11px] font-black text-[#111827]">Verification Success</p>
                </div>
                <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed">
                  GST and Registration documents verified. Trust badge active on public profiles.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FFF7ED] border border-[#FFEDD5]">
                <div className="flex gap-3 mb-2">
                  <AlertTriangle size={16} className="text-[#F97316]" />
                  <p className="text-[11px] font-black text-[#111827]">Branding Tip</p>
                </div>
                <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed">
                  Adding a high-resolution cover image can increase member inquiries by up to 37%.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-[#F3F4F6] rounded-2xl p-2 flex items-center justify-center border border-[#E5E7EB]">
              <QrCode size={48} className="text-[#111827]" />
            </div>
            <h4 className="text-sm font-black text-[#111827] mb-2 uppercase tracking-tight">Public Profile QR</h4>
            <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed mb-6 px-4">
              Dynamic QR code linked to your public landing page. Use it on marketing collateral.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 h-9 rounded-xl border border-[#E5E7EB] text-[10px] font-black uppercase tracking-widest text-[#4B5563] hover:bg-[#F9FAFB]">Download</button>
              <button className="h-9 w-9 flex items-center justify-center border border-[#E5E7EB] rounded-xl text-[#4B5563] hover:bg-[#F9FAFB]">
                <ExternalLink size={16} />
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* 21. STICKY BOTTOM SAVE BAR */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 inset-x-0 z-[200] max-w-4xl mx-auto"
          >
            <div className="bg-[#111827]/90 backdrop-blur-xl rounded-[32px] p-4 border border-white/20 shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-4 px-4">
                <div className="w-10 h-10 rounded-2xl bg-[#6366F1] flex items-center justify-center text-white animate-pulse">
                  <Info size={20} />
                </div>
                <div>
                  <div className="text-xs font-black text-white leading-none mb-1">Unsaved Changes Detected</div>
                  <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">Modified 3 fields in General Info</div>
                </div>
              </div>
              <div className="flex gap-3 pr-2">
                <button 
                  onClick={() => setHasChanges(false)}
                  className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
                >
                  Discard
                </button>
                <button className="h-12 px-6 rounded-2xl bg-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-all border border-white/10">
                  Save Draft
                </button>
                <button 
                  onClick={handleSave}
                  className="h-12 px-8 rounded-2xl bg-[#6366F1] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#4F46E5] transition-all shadow-xl shadow-indigo-500/20"
                >
                  Publish Changes
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
export function mountGymProfile(container) {
  const root = createRoot(container);
  root.render(<GymProfile />);
}

export default GymProfile;
