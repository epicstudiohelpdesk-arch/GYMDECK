import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, Component } from "react";
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
  Download
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
  { id: 2, label: "Success Rate", value: "98.2%", trend: "+0.4%", isUp: true, icon: CheckCircle2, color: "bg-emerald-500" },
  { id: 3, label: "Scheduled", value: "34", trend: "-2", isUp: false, icon: Calendar, color: "bg-amber-500" },
  { id: 4, label: "Active Campaigns", value: "3", trend: "Stable", isUp: true, icon: Megaphone, color: "bg-blue-500" },
  { id: 5, label: "Open Rate %", value: "64.8%", trend: "+4.1%", isUp: true, icon: Target, color: "bg-purple-500" },
  { id: 6, label: "Failed Deliveries", value: "12", trend: "-5", isUp: true, icon: AlertCircle, color: "bg-rose-500" },
  { id: 7, label: "WhatsApp Eng.", value: "82%", trend: "+8.4%", isUp: true, icon: MessageCircle, color: "bg-emerald-600" },
  { id: 8, label: "Response Rate", value: "14%", trend: "+2.1%", isUp: true, icon: Activity, color: "bg-cyan-500" }
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
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "bg-emerald-500" },
  { id: "sms", label: "SMS", icon: Smartphone, color: "bg-amber-500" },
  { id: "email", label: "Email", icon: Mail, color: "bg-blue-500" },
  { id: "push", label: "App Push", icon: Bell, color: "bg-indigo-600" }
];

const TEMPLATE_CATEGORIES = [
  { id: "renewal", label: "Membership Renewal", icon: RefreshCcw },
  { id: "payment", label: "Payment Reminder", icon: CreditCard },
  { id: "pt", label: "PT Session Reminder", icon: Target },
  { id: "attendance", label: "Attendance Alert", icon: Clock },
  { id: "festival", label: "Festival Greetings", icon: Star },
  { id: "promo", label: "Promotional Campaigns", icon: Zap }
];

const MOCK_HISTORY = [
  {
    id: "MSG-101",
    title: "Morning Yoga Session Update",
    type: "Announcement",
    preview: "Hi {member_name}, tomorrow's 7 AM yoga session will be held outdoors...",
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
    preview: "Your GymDeck membership is expiring in 3 days. Renew now to avoid interruption...",
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
    title: "New HIIT Batch Launch",
    type: "Promo Campaign",
    preview: "We are excited to announce a new HIIT batch starting next Monday...",
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
    title: "Emergency: Gym Closed for Maintenance",
    type: "Emergency Alert",
    preview: "Please note that the gym will be closed today for emergency maintenance...",
    recipients: 428,
    delivered: 425,
    opened: 310,
    clicked: 0,
    channels: ["sms", "push", "whatsapp"],
    status: "sent",
    timestamp: "2026-05-15T14:20:00",
    author: "Branch Manager",
    audience: "All Members"
  }
];

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────

const KPICard = ({ title, value, trend, isUp, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-default"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-current transition-transform group-hover:scale-110`}>
        {Icon && <Icon size={18} className={color.replace("bg-", "text-")} />}
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {trend}
      </div>
    </div>
    <div>
      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 block mb-1">
        {title}
      </span>
      <strong className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
        {value}
      </strong>
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
  const [scheduleType, setScheduleType] = useState("now");
  
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const toggleChannel = (id) => {
    setSelectedChannels(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (!messageTitle || !messageContent || selectedChannels.length === 0) return;
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      setMessageTitle("");
      setMessageContent("");
    }, 2000);
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

        <div className="flex-1 max-w-xl mx-12 relative group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search templates, campaigns, member groups..."
            className="w-full h-11 pl-12 pr-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
            <button 
              onClick={() => setActiveTab("composer")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === "composer" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Composer
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === "history" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              History
            </button>
          </div>
          <button 
            onClick={() => setActiveTab("composer")}
            className="h-10 px-6 rounded-xl bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
          >
            <Plus size={16} />
            New Notification
          </button>
        </div>
      </header>

      {/* 6. PAGE TITLE SECTION */}
      <div className="flex justify-between items-end mb-2 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Communication Center</h1>
          <p className="text-slate-500 text-xs font-semibold mt-2 max-w-[720px]">
            Broadcast announcements, reminders, alerts, campaigns, and operational communications across your fitness ecosystem.
          </p>
        </motion.div>
        <div className="flex gap-2">
          {["Broadcast Alerts", "Campaigns", "Smart Notifications", "Delivery Analytics"].map((pill, idx) => (
            <motion.button 
              key={pill} 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-50/50 transition-all"
            >
              {pill}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 7. KPI ANALYTICS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-2 relative z-10">
        {KPIS.map((kpi, idx) => (
          <KPICard key={kpi.id} title={kpi.label} value={kpi.value} trend={kpi.trend} isUp={kpi.isUp} icon={kpi.icon} color={kpi.color} delay={idx * 0.05} />
        ))}
      </div>

      <div className="notify-members-workspace">

        {/* 8. MASTER PAGE STRUCTURE */}
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* 9. LEFT PANEL */}
          <aside className="col-span-12 lg:col-span-2 space-y-8 sticky top-24">
            <section>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Quick Filters</span>
              <div className="space-y-2">
                {[
                  { label: "Sent Successfully", color: "bg-emerald-500" },
                  { label: "Scheduled", color: "bg-amber-500" },
                  { label: "Failed Delivery", color: "bg-rose-500" },
                  { label: "Draft Notifications", color: "bg-purple-500" },
                  { label: "High Engagement", color: "bg-slate-900" }
                ].map((filter, i) => (
                  <button key={i} className="w-full flex items-center gap-3 px-4 py-3 rounded-[16px] border border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/20 transition-all text-[11px] font-bold text-slate-600 group">
                    <span className={`w-2 h-2 rounded-full ${filter.color} ring-4 ring-offset-2 ring-transparent group-hover:ring-${filter.color.replace('bg-', '')}/20`} />
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 p-5 rounded-[24px]">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-4">Template Categories</span>
              <div className="space-y-1">
                 {TEMPLATE_CATEGORIES.map(cat => (
                   <button key={cat.id} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                        <cat.icon size={14} />
                      </div>
                      <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{cat.label}</span>
                   </button>
                 ))}
              </div>
            </section>
          </aside>

          {/* 10. CENTER WORKSPACE */}
          <div className="col-span-12 lg:col-span-7">
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
                      <div className="flex gap-2">
                         <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all flex items-center gap-2">
                            <Save size={14} /> Save Draft
                         </button>
                      </div>
                    </div>

                    <div className="p-8 space-y-10">
                      
                      {/* SECTION 1: NOTIFICATION TYPE */}
                      <section>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">1. Notification Type</span>
                        <div className="grid grid-cols-3 gap-3">
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
                      <section>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">2. Recipient Selection</span>
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">248 Members Selected</span>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            placeholder="Search individual members, branches, tags, or segments..."
                            className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                           {["Expiring Memberships", "PT Clients", "Morning Batch", "Pending Dues"].map(tag => (
                             <button key={tag} className="px-3 py-1.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-indigo-100 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                               {tag} <Plus size={12} />
                             </button>
                           ))}
                        </div>
                      </section>

                      {/* SECTION 4: DELIVERY CHANNELS */}
                      <section>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-4">3. Delivery Channels</span>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                           {CHANNELS.map(ch => {
                             const isSelected = selectedChannels.includes(ch.id);
                             return (
                               <button
                                 key={ch.id}
                                 onClick={() => toggleChannel(ch.id)}
                                 className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                                   isSelected ? `bg-white border-${ch.color.replace('bg-', '')} shadow-md relative overflow-hidden` : "bg-slate-50 border-slate-200 opacity-60 hover:opacity-100"
                                 }`}
                               >
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${isSelected ? ch.color : "bg-slate-300"}`}>
                                   <ch.icon size={14} />
                                 </div>
                                 <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{ch.label}</span>
                                 {isSelected && <div className={`absolute top-0 right-0 w-2 h-full ${ch.color}`} />}
                               </button>
                             );
                           })}
                         </div>
                      </section>

                      {/* SECTION 3: MESSAGE COMPOSER */}
                      <section>
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">4. Message Composer</span>
                           <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 hover:underline">
                             <Zap size={12} /> Smart Assistant
                           </button>
                        </div>
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Notification Title"
                            className="w-full h-14 px-6 bg-white border border-slate-200 rounded-2xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                            value={messageTitle}
                            onChange={(e) => setMessageTitle(e.target.value)}
                          />
                          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                             <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                               {['{member_name}', '{membership_expiry}', '{pending_amount}', '{trainer_name}'].map(tag => (
                                 <button key={tag} className="shrink-0 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-500 transition-all">
                                   {tag}
                                 </button>
                               ))}
                             </div>
                             <textarea
                              rows="6"
                              placeholder="Compose your message here..."
                              className="w-full p-6 text-sm font-medium text-slate-700 focus:outline-none resize-none"
                              value={messageContent}
                              onChange={(e) => setMessageContent(e.target.value)}
                             />
                          </div>
                        </div>
                      </section>

                      {/* SECTION 5 & 6: SCHEDULING & ATTACHMENTS */}
                      <div className="grid grid-cols-2 gap-6">
                        <section className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                          <div className="flex items-center gap-3 mb-4">
                             <Calendar size={16} className="text-indigo-600" />
                             <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Scheduling</span>
                          </div>
                          <select 
                            className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none"
                            value={scheduleType}
                            onChange={(e) => setScheduleType(e.target.value)}
                          >
                            <option value="now">Send Immediately</option>
                            <option value="later">Schedule for Later</option>
                            <option value="recurring">Recurring Broadcast</option>
                          </select>
                        </section>

                        <section className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 border-dashed hover:border-indigo-500 hover:bg-indigo-50/20 transition-colors cursor-pointer group flex flex-col items-center justify-center text-center">
                           <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors mb-2">
                              <Paperclip size={18} />
                           </div>
                           <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Add Attachment</span>
                           <span className="text-[9px] font-bold text-slate-400 mt-1">Images, PDFs, Invoices</span>
                        </section>
                      </div>

                    </div>

                    <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                       <p className="text-[10px] font-bold text-slate-400 max-w-xs leading-relaxed">
                         By sending this broadcast, you confirm it complies with anti-spam regulations and gym policies.
                       </p>
                       <button
                         onClick={handleSend}
                         disabled={isSending || !messageTitle || !messageContent || selectedChannels.length === 0}
                         className={`h-14 px-10 rounded-2xl flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl ${
                           isSuccess ? "bg-emerald-500 text-white shadow-emerald-200" :
                           isSending ? "bg-slate-200 text-slate-400 cursor-wait shadow-none" :
                           "bg-[#0F172A] text-white hover:bg-indigo-600 hover:shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                         }`}
                       >
                         {isSuccess ? <CheckCircle2 size={18} /> : isSending ? <RefreshCcw size={18} className="animate-spin" /> : <Send size={18} />}
                         {isSuccess ? "Broadcasted" : isSending ? "Sending..." : "Launch Broadcast"}
                       </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden min-h-[700px]"
                  >
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">Broadcast History</h2>
                      <button className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
                        <Filter size={16} />
                      </button>
                    </div>
                    
                    <div className="divide-y divide-slate-50">
                      {MOCK_HISTORY.map((msg) => {
                         const mainChannel = (msg.channels && msg.channels.length > 0) 
                           ? (CHANNELS.find(c => c.id === msg.channels[0]) || CHANNELS[0])
                           : CHANNELS[0];
                         return (
                           <div 
                             key={msg.id} 
                             onClick={() => openDrawer(msg)}
                             className="p-6 hover:bg-slate-50/80 transition-all cursor-pointer group flex items-start gap-6 relative"
                           >
                              <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform ${mainChannel.color}`}>
                                 {React.createElement(mainChannel.icon, { size: 20 })}
                              </div>
                              <div className="flex-1 min-w-0 pr-10">
                                 <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{msg.title}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                      msg.status === 'sent' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                      {msg.status}
                                    </span>
                                 </div>
                                 <div className="flex items-center gap-2 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>{msg.type}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span>{new Date(msg.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                                 </div>
                                 <p className="text-[11px] font-medium text-slate-500 line-clamp-1 mb-4">{msg.preview}</p>
                                 
                                 <div className="flex gap-6">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                      <Users size={12} /> {msg.recipients} Audience
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                                      <CheckCircle2 size={12} /> {msg.delivered} Delivered
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600">
                                      <Target size={12} /> {msg.opened} Opened
                                    </div>
                                 </div>
                              </div>
                              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all">
                                <ChevronRight size={20} />
                              </div>
                           </div>
                         );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </LocalErrorBoundary>
          </div>

          {/* 11. RIGHT PANEL */}
          <aside className="col-span-12 lg:col-span-3 space-y-6 sticky top-24">
             {/* AI Communication Insights */}
             <section className="bg-[#0F172A] border border-slate-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={120} className="text-indigo-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Intelligence</h2>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">AI Insights</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-[20px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default">
                    <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                      <strong className="text-emerald-400">WhatsApp reminders</strong> have 42% higher engagement than SMS for your active members.
                    </p>
                  </div>
                  <div className="p-4 rounded-[20px] bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-default">
                    <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                      Best notification open rate detected between <strong className="text-indigo-400">7 PM – 9 PM</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </section>

             {/* Live Preview */}
             {activeTab === "composer" && (
             <section className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Live Preview</h3>
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
               </div>

               <div className="bg-slate-900 rounded-[32px] p-3 aspect-[9/16] relative overflow-hidden border-8 border-slate-800 shadow-xl max-w-[240px] mx-auto">
                  <div className="flex justify-between px-4 pt-1 pb-4">
                     <span className="text-[8px] font-black text-white/50">9:41</span>
                  </div>
                  
                  <AnimatePresence mode="popLayout">
                    {selectedChannels.length > 0 ? (
                      <motion.div
                        key={selectedChannels[0] + messageTitle}
                        initial={{ y: -20, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }}
                        className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg mx-1 mt-2"
                      >
                         <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${CHANNELS.find(c => c.id === selectedChannels[0])?.color || "bg-slate-500"}`}>
                               {React.createElement(CHANNELS.find(c => c.id === selectedChannels[0])?.icon || Bell, { size: 12 })}
                            </div>
                            <div className="flex-1 min-w-0">
                               <span className="block text-[7px] font-black text-slate-400 uppercase leading-none mb-0.5">GymDeck • Now</span>
                               <strong className="block text-[10px] font-black text-slate-900 leading-none truncate">{messageTitle || "Notification"}</strong>
                            </div>
                         </div>
                         <p className="text-[9px] font-medium text-slate-600 line-clamp-3 leading-snug">
                            {messageContent || "Your broadcast message preview will appear here."}
                         </p>
                      </motion.div>
                    ) : (
                      <div className="text-center mt-10 opacity-30">
                        <Bell size={24} className="mx-auto text-white mb-2" />
                        <span className="text-[8px] text-white font-black uppercase">Select Channel</span>
                      </div>
                    )}
                  </AnimatePresence>
                  
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                     <div className="w-8 h-1 bg-white/20 rounded-full" />
                  </div>
               </div>
             </section>
             )}
          </aside>
        </div>

        {/* 18. BOTTOM ANALYTICS SECTION */}
        <section className="mt-16 pt-16 border-t border-slate-200">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Communication Analytics</h2>
              <p className="text-slate-500 text-[15px] font-medium mt-1">Deep-dive into delivery performance, channel effectiveness, and audience engagement.</p>
            </div>
            <button className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 hover:bg-slate-50 hover:border-indigo-500 transition-all shadow-sm">
              <Download size={16} /> Export Report
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Trends</span>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg mt-1 inline-block w-fit">+8.2% vs Last Mo</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="h-40 flex items-end gap-2 px-2 border-b border-slate-100 pb-2">
                  {[60, 45, 80, 55, 90, 75, 85].map((h, i) => (
                    <div key={i} className="flex-1 bg-indigo-100 rounded-t-md hover:bg-indigo-600 transition-colors relative group">
                      <motion.div initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} className="w-full h-full bg-indigo-500 rounded-t-md" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
             </div>

             <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Channel Performance</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                    <PieChart size={20} />
                  </div>
                </div>
                <div className="space-y-6">
                  {CHANNELS.map((ch, idx) => (
                    <div key={ch.id}>
                      <div className="flex justify-between text-[11px] font-black mb-2">
                        <span className="text-slate-600 flex items-center gap-2"><ch.icon size={12}/> {ch.label}</span>
                        <span className="text-slate-900">{[82, 65, 45, 94][idx]}% Open Rate</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${[82, 65, 45, 94][idx]}%` }} viewport={{ once: true }} className={`h-full ${ch.color}`} />
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm flex flex-col justify-center items-center text-center group hover:shadow-xl transition-all border-dashed cursor-pointer">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-6 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                   <Settings size={32} />
                </div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">Automation Engine</h3>
                <p className="text-xs font-bold text-slate-500 max-w-[200px]">Configure smart triggers, auto-renewals, and behavior-based alerts.</p>
                <button className="mt-6 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  Configure Rules <ArrowRight size={14} />
                </button>
             </div>
          </div>
        </section>
      </div>

      {/* 12. NOTIFICATION HISTORY DRAWER */}
      <AnimatePresence>
        {drawerOpen && selectedHistoryItem && (
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex justify-end"
          >
            <motion.div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setDrawerOpen(false)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="relative h-full w-full max-w-[560px] bg-white shadow-2xl flex flex-col overflow-hidden rounded-l-[40px]"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                 <div>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-100 mb-3 inline-block">
                      {selectedHistoryItem.type}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2 pr-8">
                      {selectedHistoryItem.title}
                    </h2>
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <span>{new Date(selectedHistoryItem.timestamp).toLocaleString()}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-300" />
                       <span>By {selectedHistoryItem.author}</span>
                    </div>
                 </div>
                 <button onClick={() => setDrawerOpen(false)} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-400 hover:text-slate-900">
                    <X size={20} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                 <section>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Delivery Analytics</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-1">Delivered</span>
                          <strong className="text-3xl font-black text-emerald-600">{selectedHistoryItem.delivered}</strong>
                          <span className="text-[9px] font-bold text-emerald-600/70 block mt-1">/ {selectedHistoryItem.recipients} Recipients</span>
                       </div>
                       <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                          <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block mb-1">Opened</span>
                          <strong className="text-3xl font-black text-indigo-600">{selectedHistoryItem.opened}</strong>
                          <span className="text-[9px] font-bold text-indigo-600/70 block mt-1">{((selectedHistoryItem.opened/selectedHistoryItem.delivered)*100 || 0).toFixed(0)}% Open Rate</span>
                       </div>
                    </div>
                 </section>

                 <section>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Audience & Channels</h3>
                    <div className="space-y-3">
                       <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500">Target Audience</span>
                          <strong className="text-[11px] font-black text-slate-900">{selectedHistoryItem.audience}</strong>
                       </div>
                       <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500">Channels Used</span>
                          <div className="flex gap-2">
                             {(selectedHistoryItem.channels || []).map(chId => {
                               const ch = CHANNELS.find(c => c.id === chId);
                               if(!ch) return null;
                               return (
                                 <div key={chId} className={`w-6 h-6 rounded bg-white shadow-sm flex items-center justify-center ${ch.color.replace('bg-', 'text-')}`}>
                                   <ch.icon size={12} />
                                 </div>
                               );
                             })}
                          </div>
                       </div>
                    </div>
                 </section>

                 <section>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Message Content</h3>
                    <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                       <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {selectedHistoryItem.preview}
                       </p>
                    </div>
                 </section>
              </div>

              <div className="p-8 border-t border-slate-100 bg-white">
                 <button className="w-full h-14 rounded-2xl bg-white border border-slate-200 text-[#0F172A] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-indigo-500 transition-all shadow-sm">
                    <Copy size={16} /> Duplicate as New Broadcast
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
