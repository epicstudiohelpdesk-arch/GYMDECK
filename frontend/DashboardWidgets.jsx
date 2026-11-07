import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Zap, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  Users, 
  Search, 
  Wifi, 
  Calendar, 
  Bell, 
  TrendingUp, 
  RefreshCw,
  Gauge
} from "lucide-react";
import BrandFooter from "./BrandFooter.jsx";

/**
 * GYMDECK • EXECUTIVE COMMAND CENTER
 * Authentic GymDeck Design System (Light Theme)
 * Rich Tactile Componentry, Warm Depth, High-Fidelity Data Visualization
 * Strictly Following the 5-Card Layout Geometry & 100% Window Fit
 */

export const Dashboard = () => {
  // Topbar / Search
  const [searchQuery, setSearchQuery] = useState("");

  // Card 1: Hero Analytics Timeframe
  const [timeframe, setTimeframe] = useState("24H");

  // Card 2: Interactive Auto-Gate Slider / Toggle
  const [autoGateActive, setAutoGateActive] = useState(true);

  // Card 3: Trajectory Forecast & 3 Series Toggles
  const [forecastActive, setForecastActive] = useState(true);
  const [seriesToggles, setSeriesToggles] = useState({
    collections: true,
    renewals: true,
    dues: true
  });

  // Card 4: System Daemon & Force Sync
  const [autoSyncDaemon, setAutoSyncDaemon] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState(false);

  // Card 5: Live Occupancy Dial & Shift Selector
  const [sensorsLive, setSensorsLive] = useState(true);
  const [occupancyShift, setOccupancyShift] = useState("live"); // "morning" | "live" | "evening"

  // Toast notifications for user actions
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Trigger Add Member modal in host application
  const handleOpenAddMember = () => {
    const addMemberTrigger = document.querySelector(".add-member-inline, [data-add-member-open]");
    if (addMemberTrigger && addMemberTrigger !== event?.currentTarget) {
      addMemberTrigger.click();
      return;
    }
    const modal = document.querySelector(".member-form-modal");
    const backdrop = document.querySelector(".member-form-backdrop");
    if (modal) modal.classList.add("is-visible");
    if (backdrop) backdrop.classList.add("is-visible");
  };

  // Trigger force synchronization
  const handleForceSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    showToast("Initiating instant biometric & cloud synchronization...");
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccessToast(true);
      showToast("Sync complete: 42 records processed across 2 turnstiles.");
      setTimeout(() => setSyncSuccessToast(false), 2500);
    }, 1200);
  };

  // Occupancy metrics based on shift
  const occupancyData = {
    morning: { count: 68, max: 80, pct: 85, label: "Morning Shift", sub: "Recorded at 08:30 AM" },
    live: { count: 43, max: 60, pct: 74, label: "Live Headcount", sub: "Peak expected in 38 min" },
    evening: { count: 87, max: 90, pct: 96, label: "Evening Shift", sub: "Tracking near ceiling" }
  };
  const activeOccupancy = occupancyData[occupancyShift] || occupancyData.live;

  // Hero chart dynamic dataset with comparative benchmarks
  const heroDatasets = {
    "24H": {
      collections: "₹8,42,500",
      collectionsDelta: "+18.4%",
      checkins: "186",
      checkinsDelta: "+24.2%",
      capacity: "43",
      capacityMax: "60",
      capacityPct: "74% Load",
      points: [
        { label: "06:00", value: 32, prev: 24 },
        { label: "09:00", value: 58, prev: 46 },
        { label: "12:00", value: 41, prev: 38 },
        { label: "15:00", value: 36, prev: 30 },
        { label: "18:00", value: 87, prev: 72 },
        { label: "21:00", value: 43, prev: 39 }
      ]
    },
    "7D": {
      collections: "₹2,18,000",
      collectionsDelta: "+12.1%",
      checkins: "1,128",
      checkinsDelta: "+8.6%",
      capacity: "78%",
      capacityMax: "Avg",
      capacityPct: "Optimal",
      points: [
        { label: "Mon", value: 142, prev: 130 },
        { label: "Tue", value: 165, prev: 148 },
        { label: "Wed", value: 158, prev: 150 },
        { label: "Thu", value: 172, prev: 160 },
        { label: "Fri", value: 186, prev: 165 },
        { label: "Sat", value: 195, prev: 180 },
        { label: "Sun", value: 110, prev: 105 }
      ]
    },
    "30D": {
      collections: "₹8,42,000",
      collectionsDelta: "+24.6%",
      checkins: "4,820",
      checkinsDelta: "+15.4%",
      capacity: "74%",
      capacityMax: "Avg",
      capacityPct: "Healthy",
      points: [
        { label: "W1", value: 1120, prev: 980 },
        { label: "W2", value: 1180, prev: 1040 },
        { label: "W3", value: 1240, prev: 1110 },
        { label: "W4", value: 1280, prev: 1150 }
      ]
    },
    "1Y": {
      collections: "₹34,80,000",
      collectionsDelta: "+31.2%",
      checkins: "54.2K",
      checkinsDelta: "+28.0%",
      capacity: "82%",
      capacityMax: "Lift",
      capacityPct: "Target",
      points: [
        { label: "Q1", value: 12400, prev: 10200 },
        { label: "Q2", value: 13800, prev: 11400 },
        { label: "Q3", value: 14200, prev: 12100 },
        { label: "Q4", value: 14800, prev: 12800 }
      ]
    }
  };
  const currentHero = heroDatasets[timeframe];

  return (
    <div className="w-full min-h-screen bg-[#f4f7fb] text-slate-800 font-sans selection:bg-blue-600 selection:text-white flex flex-col pb-6">
      
      {/* ─────────────────────────────────────────────────────────────
          TOP EXECUTIVE OPERATIONS BAR
          Prominent, beautifully aligned, elevated header with proper spacing
      ───────────────────────────────────────────────────────────── */}
      <header className="h-[60px] px-6 border-b border-[#e2e8f0] bg-white sticky top-0 z-30 flex items-center justify-between gap-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)]">
        
        {/* Left: Global Search Operations (Perfect Flex Alignment & Spacing) */}
        <div className="flex items-center flex-1 max-w-lg h-[42px] bg-[#f8fafc] hover:bg-white focus-within:bg-white rounded-xl border border-slate-200/90 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all shadow-2xs px-3.5 gap-2.5">
          <Search size={16} strokeWidth={2.2} className="text-slate-400 shrink-0 select-none pointer-events-none" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members, dues, check-ins, trainers..."
            className="w-full h-full bg-transparent border-0 outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
          />
          <kbd className="h-5 px-1.5 flex items-center justify-center text-[10px] font-mono font-bold rounded bg-slate-200/70 text-slate-500 border border-slate-300/70 select-none shrink-0">
            /
          </kbd>
        </div>

        {/* Right: Telemetry, Date, Status & Quick Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Clean Date Pill (EVENING SHIFT removed per user specification) */}
          <div className="h-[38px] px-3.5 rounded-xl bg-[#f8fafc] border border-slate-200/90 flex items-center gap-2.5 text-xs font-black text-slate-700 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={14} strokeWidth={2.2} />
            </div>
            <span>Fri, 06 Nov</span>
          </div>

          {/* Cloud Sync Status Badge */}
          <div 
            onClick={handleForceSync}
            className="h-[38px] px-3.5 rounded-xl bg-emerald-50 border border-emerald-200/90 hover:bg-emerald-100/70 cursor-pointer flex items-center gap-2 text-xs font-black text-emerald-800 transition-all shadow-2xs active:scale-[0.98]"
            title="Click to trigger instant biometric & cloud sync"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
            <span>Cloud Synced</span>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[#f1f5f9] border border-slate-200/80">
            {/* Refresh Action */}
            <button 
              type="button"
              onClick={() => showToast("Floor telemetry refreshed.")}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Refresh Telemetry"
            >
              <RefreshCw size={13} strokeWidth={2.2} />
            </button>

            {/* Notifications Action */}
            <button 
              type="button"
              onClick={() => showToast("No urgent manager escalations.")}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 relative"
              title="Alerts"
            >
              <Bell size={13} strokeWidth={2.2} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MASTER 5-CARD WIREFRAME GRID
          Row 1: Card 1 (Span 8) + Card 2 (Span 4)
          Row 2: Card 3 (Span 5) + Card 4 (Span 3) + Card 5 (Span 4)
      ───────────────────────────────────────────────────────────── */}
      <main className="p-3.5 max-w-[1560px] w-full mx-auto space-y-3.5">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

          {/* ══════════════════════════════════════════════════════════
              CARD 1: TOP-LEFT HERO ANALYTICS & OPERATIONS PULSE
              (User-friendly, bold, crystal clear telemetry, exactly h-[365px])
          ══════════════════════════════════════════════════════════ */}
          <section className="lg:col-span-8 bg-white border border-[#e2e8f0] rounded-[22px] p-4 shadow-[0_4px_20px_-4px_rgba(69,79,97,0.06)] relative flex flex-col justify-between h-[365px]">
            
            {/* Header: Clean, Bold Title & 4 Timeframe Pills */}
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse ring-4 ring-blue-500/15 shrink-0" />
                <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">
                  Today's Floor & Revenue Pulse
                </h2>
              </div>

              {/* Timeframe Segmented Control (Wireframe 4 Pills) */}
              <div className="flex items-center p-0.5 rounded-xl bg-[#f1f5f9] border border-slate-200/80">
                {["24H", "7D", "30D", "1Y"].map((tf) => {
                  const isSelected = timeframe === tf;
                  return (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-white text-slate-900 shadow-2xs font-black" 
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics Row: Clean, Bold, High-Contrast 3-Column Strip (Not Clumsy or Over-Boxed) */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-2.5 my-1 relative z-10 shadow-2xs">
              
              {/* Metric 1: Floor Occupancy */}
              <div className="px-3.5 first:pl-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">
                  Floor Headcount
                </span>
                <div className="flex items-baseline gap-2">
                  <strong className="text-2xl font-black text-slate-900 tracking-tight">{currentHero.capacity}</strong>
                  <span className="text-xs font-bold text-slate-400">/ {currentHero.capacityMax}</span>
                  <span className="ml-auto text-[10px] font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200/60">
                    {currentHero.capacityPct}
                  </span>
                </div>
              </div>

              {/* Metric 2: Collections Inflow */}
              <div className="px-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">
                  Collections Today
                </span>
                <div className="flex items-baseline gap-2">
                  <strong className="text-2xl font-black text-slate-900 tracking-tight">{currentHero.collections}</strong>
                  <span className="ml-auto text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    {currentHero.collectionsDelta}
                  </span>
                </div>
              </div>

              {/* Metric 3: Turnstile Check-ins */}
              <div className="px-3.5 last:pr-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">
                  Turnstile Check-ins
                </span>
                <div className="flex items-baseline gap-2">
                  <strong className="text-2xl font-black text-slate-900 tracking-tight">{currentHero.checkins}</strong>
                  <span className="ml-auto text-[10px] font-black text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200/60">
                    {currentHero.checkinsDelta}
                  </span>
                </div>
              </div>

            </div>

            {/* ─── Expansive High-Fidelity Area Chart Canvas ─── */}
            <div className="w-full flex-1 relative z-10 flex flex-col justify-end pt-1">
              
              <div className="relative w-full h-[145px] flex gap-2">
                {/* Y-Axis Reference Scale */}
                <div className="w-6 h-full flex flex-col justify-between text-[9px] font-mono font-bold text-slate-400 select-none pb-1 text-right pr-0.5 shrink-0">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>0</span>
                </div>

                {/* SVG Graph Canvas */}
                <div className="relative flex-1 h-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 660 130" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="richAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="richLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1d4ed8" />
                        <stop offset="60%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guide Gridlines with Soft Tint */}
                    <line x1="0" y1="12" x2="660" y2="12" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1.2" />
                    <line x1="0" y1="46" x2="660" y2="46" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1.2" />
                    <line x1="0" y1="84" x2="660" y2="84" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1.2" />
                    <line x1="0" y1="122" x2="660" y2="122" stroke="#e2e8f0" strokeWidth="1.5" />

                    {/* Rich Area Gradient Fill */}
                    <path
                      d="M 0,88 C 90,80 150,38 230,50 C 310,60 380,72 450,58 C 510,44 560,14 600,16 C 630,20 650,54 660,60 L 660,122 L 0,122 Z"
                      fill="url(#richAreaGrad)"
                    />

                    {/* Secondary Benchmark Curve (Previous Day / Baseline) */}
                    <path
                      d="M 0,100 C 90,92 150,66 230,72 C 310,76 380,90 450,78 C 510,66 560,36 600,34 C 630,32 650,70 660,74"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.8"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />

                    {/* Primary Spline Line (Current Period - Vibrant Blue) */}
                    <path
                      d="M 0,88 C 90,80 150,38 230,50 C 310,60 380,72 450,58 C 510,44 560,14 600,16 C 630,20 650,54 660,60"
                      fill="none"
                      stroke="url(#richLineGrad)"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />

                    {/* Vertical Guideline at Peak (18:00) */}
                    <line x1="600" y1="16" x2="600" y2="122" stroke="#3b82f6" strokeDasharray="2 2" strokeWidth="1.2" />

                    {/* Key Peak Radar Node */}
                    <g transform="translate(600, 16)">
                      <circle r="9" fill="none" stroke="rgba(37,99,235,0.3)" className="animate-ping" />
                      <circle r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  </svg>

                  {/* Floating Precision Tooltip Badge at Peak */}
                  <div 
                    className="absolute pointer-events-none"
                    style={{ top: "-8px", right: "20px" }}
                  >
                    <div className="bg-[#0f172a] text-white text-[10.5px] font-black px-3 py-1 rounded-lg shadow-lg flex items-center gap-1.5 border border-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>18:00 Peak • 87 Check-ins (+24%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* X-Axis Time Labels & Legend */}
              <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-500 pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-1 bg-blue-600 rounded-full" />
                    <span className="text-slate-800 font-black">Today</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 border-t-2 border-dashed border-slate-400" />
                    <span className="text-slate-500 font-bold">Baseline</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 font-mono text-slate-500 font-bold">
                  {currentHero.points.map((pt, i) => (
                    <span key={i} className="hover:text-blue-600 transition-colors">
                      {pt.label}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </section>


          {/* ══════════════════════════════════════════════════════════
              CARD 2: TOP-RIGHT ROSTER & PRIORITY QUEUE
              (Wireframe: top title pill + indicator, 2 items, 
               prominent middle pill slider, 1 item, bottom full button)
          ══════════════════════════════════════════════════════════ */}
          <section className="lg:col-span-4 bg-white border border-[#e2e8f0] rounded-[22px] p-3.5 shadow-[0_4px_20px_-4px_rgba(69,79,97,0.06)] relative flex flex-col justify-between h-[365px]">
            
            {/* Header: Title + Status Pill (Matching Wireframe!) */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">
                  Staff Load & Queue
                </span>
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                  Active Roster
                </h3>
              </div>

              <div className="h-[22px] px-2.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[9.5px] font-black tracking-wider uppercase flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>3 Pending</span>
              </div>
            </div>

            {/* Item 1: Ankit Kumar */}
            <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-[#f8fafc] hover:bg-slate-100/80 border border-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <div 
                  className="w-[28px] h-[28px] rounded-full text-white font-black text-[11px] flex items-center justify-center shadow-xs shrink-0"
                  style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5)" }}
                >
                  AK
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Ankit Kumar</h4>
                  <p className="text-[10px] text-slate-600 font-bold leading-none mt-0.5">Head Coach • 4 PT Sessions</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                On Floor
              </span>
            </div>

            {/* Item 2: Sneha Patel */}
            <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-[#f8fafc] hover:bg-slate-100/80 border border-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <div 
                  className="w-[28px] h-[28px] rounded-full text-white font-black text-[11px] flex items-center justify-center shadow-xs shrink-0"
                  style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
                >
                  SP
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Sneha Patel</h4>
                  <p className="text-[10px] text-slate-600 font-bold leading-none mt-0.5">Nutrition Consult • 2 Clients</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[9px] font-black uppercase tracking-wider">
                7:30 PM
              </span>
            </div>

            {/* ─── FEATURED ITEM 3: PROMINENT HARDWARE TURNSTILE SLIDER PILL IN WIREFRAME! ─── */}
            <div 
              onClick={() => {
                const nextState = !autoGateActive;
                setAutoGateActive(nextState);
                showToast(nextState ? "Auto-Turnstile Gate: ACTIVE (RFID auto-accept)" : "Turnstile Gate switched to MANUAL check-in.");
              }}
              className="py-1.5 px-2.5 rounded-xl border border-blue-200/90 hover:border-blue-300 transition-all cursor-pointer select-none flex items-center justify-between group shadow-xs"
              style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(99,102,241,0.06))" }}
              title="Click to toggle between Auto-Turnstile Pass and Manual Gate"
            >
              <div className="flex items-center gap-2">
                <div className="w-[26px] h-[26px] rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Wifi size={13} strokeWidth={2.2} />
                </div>
                <div>
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-900 block leading-tight">
                    {autoGateActive ? "Auto-Turnstile Gate" : "Manual Gate Pass"}
                  </span>
                  <span className="text-[9.5px] text-slate-600 font-bold leading-none">
                    {autoGateActive ? "43 Passes Auto-Verified Today" : "Manual Override Mode"}
                  </span>
                </div>
              </div>

              {/* iOS-Style Tactile Toggle Switch */}
              <div className="flex items-center gap-1.5">
                <span className={`text-[8.5px] font-black uppercase tracking-wider ${autoGateActive ? "text-blue-700" : "text-slate-400"}`}>
                  {autoGateActive ? "ONLINE" : "OFF"}
                </span>
                <div className={`w-7 h-3.5 rounded-full p-0.5 transition-colors ${autoGateActive ? "bg-blue-600" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-2.5 h-2.5 rounded-full bg-white shadow-xs"
                    animate={{ x: autoGateActive ? 14 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* Item 4: Rohan Verma */}
            <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-[#f8fafc] hover:bg-slate-100/80 border border-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <div 
                  className="w-[28px] h-[28px] rounded-full text-white font-black text-[11px] flex items-center justify-center shadow-xs shrink-0"
                  style={{ background: "linear-gradient(135deg, #10b981, #0d9488)" }}
                >
                  RV
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">Rohan Verma</h4>
                  <p className="text-[10px] text-slate-600 font-bold leading-none mt-0.5">Indiranagar • Annual Member</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black uppercase tracking-wider">
                Checked In
              </span>
            </div>

            {/* ─── ITEM 5: BOTTOM FULL-WIDTH BUTTON (Matching Wireframe!) ─── */}
            <button
              type="button"
              onClick={handleOpenAddMember}
              className="w-full h-[32px] rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-black text-[11.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
            >
              <UserPlus size={13} strokeWidth={2.2} />
              <span>+ Quick Add Member</span>
            </button>
          </section>

        </div>

        {/* ══════════════════════════════════════════════════════════
            ROW 2: 3 CARDS SIDE-BY-SIDE
            Card 3 (Span 5) + Card 4 (Span 3) + Card 5 (Span 4)
            (5 + 3 = 8 cols) perfectly under Card 1!
            Card 5 (4 cols) perfectly under Card 2!
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

          {/* ══════════════════════════════════════════════════════════
              CARD 3: BOTTOM-LEFT TRAJECTORY & CALLOUT PIN TELEMETRY
              (Wireframe: 2 text pills top-left, 1 switch top-right,
               curve with TWO CALLOUT PINS + leader lines, 3 switches in row at bottom)
          ══════════════════════════════════════════════════════════ */}
          <section className="lg:col-span-5 bg-white border border-[#e2e8f0] rounded-[22px] p-3.5 shadow-[0_4px_20px_-4px_rgba(69,79,97,0.06)] relative flex flex-col justify-between h-[300px]">
            
            {/* Header: Title & Subtitle on Left + Forecast Switch on Right (Matching Wireframe!) */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-0.2">
                  Revenue Pulse
                </span>
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                  Collections Trajectory
                </h3>
                <p className="text-[10.5px] text-slate-600 font-bold mt-0.5">
                  Target: ₹9,00,000 • <span className="text-emerald-600 font-black">93.5% Pace</span>
                </p>
              </div>

              {/* Right Toggle Switch (Matching Wireframe: Toggle at Top Right!) */}
              <div 
                onClick={() => {
                  setForecastActive(!forecastActive);
                  showToast(!forecastActive ? "Forecast target line enabled." : "Forecast line hidden.");
                }}
                className="flex items-center gap-1.5 cursor-pointer select-none"
                title="Toggle Target Forecast"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Forecast</span>
                <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${forecastActive ? "bg-blue-600" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-3.5 h-3.5 rounded-full bg-white shadow-xs"
                    animate={{ x: forecastActive ? 14 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* Canvas Area with TWO CALLOUT PINS WITH LEADER LINES (Directly from Wireframe!) */}
            <div className="relative w-full h-36 my-1">
              
              {/* Telemetry Line Chart Background SVG */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 480 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="trajAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="60%" stopColor="#10b981" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="trajLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="60%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                <line x1="0" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1.2" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1.2" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="480" y2="100" stroke="#cbd5e1" strokeWidth="1.2" />

                {/* Target Dashed Line if Forecast is ON */}
                {forecastActive && (
                  <line 
                    x1="0" y1="32" x2="480" y2="32" 
                    stroke="#3b82f6" 
                    strokeWidth="1.8" 
                    strokeDasharray="5 4" 
                  />
                )}

                {/* Soft Area Gradient */}
                {seriesToggles.collections && (
                  <path
                    d="M 15,96 C 80,90 130,40 190,40 C 250,40 280,78 350,78 C 400,78 435,26 470,26 L 470,100 L 15,100 Z"
                    fill="url(#trajAreaGrad)"
                  />
                )}

                {/* Trajectory Main Curve (Collections) */}
                {seriesToggles.collections && (
                  <path
                    d="M 15,96 C 80,90 130,40 190,40 C 250,40 280,78 350,78 C 400,78 435,26 470,26"
                    fill="none"
                    stroke="url(#trajLineGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                )}

                {/* Leader line for Pin 1 */}
                <line x1="190" y1="20" x2="190" y2="40" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2 2" />

                {/* Peak Point Node (under Pin 1) */}
                <g transform="translate(190, 40)">
                  <circle r="7" fill="none" stroke="rgba(16,185,129,0.3)" className="animate-ping" />
                  <circle r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                </g>

                {/* Leader line for Pin 2 */}
                <line x1="350" y1="78" x2="350" y2="98" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2" />

                {/* Dip Point Node (under Pin 2) */}
                <g transform="translate(350, 78)">
                  <circle r="7" fill="none" stroke="rgba(245,158,11,0.3)" className="animate-ping" />
                  <circle r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" />
                </g>
              </svg>

              {/* ─── CALLOUT PIN 1: TOP-LEFT PEAK (Matching Wireframe!) ─── */}
              <div 
                className="absolute pointer-events-auto"
                style={{ top: "0px", left: "39.58%", transform: "translateX(-50%)", zIndex: 10 }}
              >
                <div className="px-3 py-1 rounded-xl bg-white border border-emerald-200 shadow-md flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div>
                    <span className="text-xs font-black text-slate-900 leading-none block">₹8,42,000</span>
                    <span className="text-[10px] text-emerald-600 font-black leading-none">Peak Inflow (+18%)</span>
                  </div>
                </div>
              </div>

              {/* ─── CALLOUT PIN 2: BOTTOM-RIGHT DIP (Matching Wireframe!) ─── */}
              <div 
                className="absolute pointer-events-auto"
                style={{ bottom: "0px", left: "72.9%", transform: "translateX(-50%)", zIndex: 10 }}
              >
                <div className="px-3 py-1 rounded-xl bg-white border border-amber-200 shadow-md flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div>
                    <span className="text-xs font-black text-slate-900 leading-none block">₹64,500</span>
                    <span className="text-[10px] text-amber-600 font-black leading-none">12 Overdue</span>
                  </div>
                </div>
              </div>

            </div>

            {/* ─── BOTTOM ROW: 3 TOGGLE SWITCHES IN A ROW (Matching Wireframe!) ─── */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
              
              {/* Switch 1: Collections */}
              <div 
                onClick={() => setSeriesToggles({ ...seriesToggles, collections: !seriesToggles.collections })}
                className="flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl bg-[#f8fafc] hover:bg-slate-100 border border-slate-200/80 cursor-pointer select-none flex-1 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[11px] font-black text-slate-800 truncate">Collections</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors ${seriesToggles.collections ? "bg-emerald-500" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-2.5 h-2.5 rounded-full bg-white shadow-xs"
                    animate={{ x: seriesToggles.collections ? 10 : 0 }}
                  />
                </div>
              </div>

              {/* Switch 2: Renewals */}
              <div 
                onClick={() => setSeriesToggles({ ...seriesToggles, renewals: !seriesToggles.renewals })}
                className="flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl bg-[#f8fafc] hover:bg-slate-100 border border-slate-200/80 cursor-pointer select-none flex-1 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span className="text-[11px] font-black text-slate-800 truncate">Renewals</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors ${seriesToggles.renewals ? "bg-blue-600" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-2.5 h-2.5 rounded-full bg-white shadow-xs"
                    animate={{ x: seriesToggles.renewals ? 10 : 0 }}
                  />
                </div>
              </div>

              {/* Switch 3: Overdue */}
              <div 
                onClick={() => setSeriesToggles({ ...seriesToggles, dues: !seriesToggles.dues })}
                className="flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl bg-[#f8fafc] hover:bg-slate-100 border border-slate-200/80 cursor-pointer select-none flex-1 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[11px] font-black text-slate-800 truncate">Overdue</span>
                </div>
                <div className={`w-6 h-3.5 rounded-full p-0.5 transition-colors ${seriesToggles.dues ? "bg-amber-500" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-2.5 h-2.5 rounded-full bg-white shadow-xs"
                    animate={{ x: seriesToggles.dues ? 10 : 0 }}
                  />
                </div>
              </div>

            </div>
          </section>


          {/* ══════════════════════════════════════════════════════════
              CARD 4: BOTTOM-MIDDLE SYSTEM SYNC & AUTOMATION HUB
              (Wireframe: top pill + indicator, stats, 
               sub-section with 2 lines + 1 switch, bottom wide pill slider)
          ══════════════════════════════════════════════════════════ */}
          <section className="lg:col-span-3 bg-white border border-[#e2e8f0] rounded-[22px] p-3.5 shadow-[0_4px_20px_-4px_rgba(69,79,97,0.06)] relative flex flex-col justify-between h-[300px]">
            
            {/* Header: Title on Left + Online Indicator on Right (Matching Wireframe!) */}
            <div className="flex items-center justify-between gap-1.5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block mb-0.2">
                  Local System
                </span>
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                  Sync Status
                </h3>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9.5px] font-black tracking-wider uppercase flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Online</span>
              </span>
            </div>

            {/* Sync Telemetry Details: Progress Bar + Rich Rows */}
            <div className="my-1.5 space-y-2">
              <div className="p-2.5 rounded-xl bg-[#f8faff] border border-blue-100/80">
                <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                  <span className="text-slate-600 font-extrabold uppercase tracking-wider">Data Integrity</span>
                  <span className="text-blue-700 font-mono font-black text-xs">97% Buffer</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full w-[97%]" />
                </div>
              </div>

              <div className="space-y-1.5 pl-0.5">
                <div className="flex items-center gap-2 text-xs text-slate-800 font-bold">
                  <div className="w-5.5 h-5.5 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Zap size={12} strokeWidth={2.2} />
                  </div>
                  <span><strong className="font-black text-slate-900">42</strong> records queued locally</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-800 font-bold">
                  <div className="w-5.5 h-5.5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={12} strokeWidth={2.2} />
                  </div>
                  <span><strong className="font-black text-slate-900">2</strong> biometric turnstiles linked</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600 font-bold">
                  <div className="w-5.5 h-5.5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Clock size={12} strokeWidth={2.2} />
                  </div>
                  <span>Cloud handshake: 32s ago</span>
                </div>
              </div>
            </div>

            {/* ─── SUB-SECTION: TWO LINES + TOGGLE SWITCH ON RIGHT (Matching Wireframe!) ─── */}
            <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-slate-200/80 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-900 leading-tight">Auto-Sync Daemon</h4>
                <p className="text-[10px] text-slate-600 mt-0.2 font-bold">&lt; 40ms local failover pipe</p>
              </div>

              {/* Right Toggle Switch */}
              <div 
                onClick={() => {
                  setAutoSyncDaemon(!autoSyncDaemon);
                  showToast(!autoSyncDaemon ? "Auto-Sync Daemon enabled." : "Auto-Sync Daemon paused.");
                }}
                className="cursor-pointer select-none"
                title="Toggle Auto-Sync Daemon"
              >
                <div className={`w-7.5 h-4 rounded-full p-0.5 transition-colors ${autoSyncDaemon ? "bg-emerald-500" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-3 h-3 rounded-full bg-white shadow-xs"
                    animate={{ x: autoSyncDaemon ? 14 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* ─── BOTTOM WIDE ACTION BUTTON (Matching Wireframe!) ─── */}
            <div 
              onClick={handleForceSync}
              className="h-8.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 flex items-center justify-between px-3 cursor-pointer select-none transition-all group active:scale-[0.99]"
              title="Click to force immediate sync"
            >
              <div className="flex items-center gap-2">
                <RefreshCw size={12} strokeWidth={2.2} className={`text-slate-800 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  {isSyncing ? "Syncing..." : "Force Sync Now"}
                </span>
              </div>
              <span className="text-xs font-black text-blue-600 group-hover:translate-x-0.5 transition-transform">
                Instant →
              </span>
            </div>
          </section>


          {/* ══════════════════════════════════════════════════════════
              CARD 5: BOTTOM-RIGHT LIVE OCCUPANCY ORBITAL DIAL & GAUGE
              (Wireframe: 2 text lines top-left, 1 switch top-right,
               large circular orbital dial in center, 
               central knob flanked by 2 pill buttons at bottom)
          ══════════════════════════════════════════════════════════ */}
          <section className="lg:col-span-4 bg-white border border-[#e2e8f0] rounded-[22px] p-3.5 shadow-[0_4px_20px_-4px_rgba(69,79,97,0.06)] relative flex flex-col justify-between h-[300px]">
            
            {/* Header: Title on Left, Capacity % + Sensors Switch on Right */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-0.2">
                  Live Occupancy
                </span>
                <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                  Capacity Used
                </h3>
                <p className="text-[10.5px] text-slate-600 font-bold mt-0.5">
                  Max: <strong className="text-slate-900 font-black">{activeOccupancy.count}</strong> / {activeOccupancy.max} Members
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-base font-black text-blue-600 tracking-tight">
                  {activeOccupancy.pct}%
                </span>
                
                {/* Sensors Toggle */}
                <div 
                  onClick={() => {
                    setSensorsLive(!sensorsLive);
                    showToast(!sensorsLive ? "Occupancy sensors connected." : "Occupancy sensors paused.");
                  }}
                  className="flex items-center cursor-pointer select-none"
                  title="Toggle Sensor Feed"
                >
                  <div className={`w-7.5 h-4 rounded-full p-0.5 transition-colors ${sensorsLive ? "bg-blue-600" : "bg-slate-300"}`}>
                    <motion.div 
                      className="w-3 h-3 rounded-full bg-white shadow-xs"
                      animate={{ x: sensorsLive ? 14 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── CENTER: THE ORBITAL RADIAL DIAL & GAUGE (Substantial & Vibrant!) ─── */}
            <div className="relative w-full flex items-center justify-center py-0.5">
              <div className="relative w-32 h-32 flex items-center justify-center">
                
                {/* SVG Orbital Track & Radial Gauge */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 176 176">
                  <defs>
                    <linearGradient id="orbitalArcGradRich" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>

                  {/* Outer Fine Track Ring (Matching Wireframe!) */}
                  <circle
                    cx="88" cy="88" r="80"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />

                  {/* Inner Track Background */}
                  <circle
                    cx="88" cy="88" r="62"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="11"
                  />

                  {/* Inner Glowing Progress Arc */}
                  <motion.circle
                    cx="88" cy="88" r="62"
                    fill="none"
                    stroke="url(#orbitalArcGradRich)"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray="390"
                    animate={{ strokeDashoffset: 390 - (390 * activeOccupancy.pct) / 100 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </svg>

                {/* Orbiting Beacon Dot along Outer Track */}
                <motion.div 
                  className="absolute inset-0 pointer-events-none"
                  animate={{ rotate: sensorsLive ? 360 : 45 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-blue-600 shadow-md border-2 border-white" />
                </motion.div>

                {/* Center Dial Core Information (Bold & Punchy!) */}
                <div className="text-center z-10 flex flex-col items-center">
                  <strong className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                    {activeOccupancy.count}
                  </strong>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 mt-0.5">
                    Inside Floor
                  </span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200/80 mt-1">
                    Safe Load
                  </span>
                </div>
              </div>
            </div>

            {/* ─── BOTTOM CONTROLS: 3 SHIFT BLOCKS (Directly from Wireframe & GymDeck standard!) ─── */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 select-none">
              
              {/* Left Pill: Morning */}
              <button
                type="button"
                onClick={() => setOccupancyShift("morning")}
                className={`h-7 px-3.5 rounded-xl text-[11.5px] font-black transition-all cursor-pointer ${
                  occupancyShift === "morning"
                    ? "bg-[#0f172a] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80"
                }`}
              >
                Morning 68
              </button>

              {/* Center Circular Knob / Live Button (Matching Wireframe!) */}
              <button
                type="button"
                onClick={() => setOccupancyShift("live")}
                className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                  occupancyShift === "live"
                    ? "bg-blue-600 text-white ring-4 ring-blue-500/20 scale-105"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200/80"
                }`}
                title="Switch to Live Headcount"
              >
                <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
              </button>

              {/* Right Pill: Evening */}
              <button
                type="button"
                onClick={() => setOccupancyShift("evening")}
                className={`h-7 px-3.5 rounded-xl text-[11.5px] font-black transition-all cursor-pointer ${
                  occupancyShift === "evening"
                    ? "bg-[#0f172a] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80"
                }`}
              >
                Evening 87
              </button>

            </div>
          </section>

        </div>

      </main>

      {/* ─────────────────────────────────────────────────────────────
          BRAND SIGNATURE FOOTER (Engineered in India)
      ───────────────────────────────────────────────────────────── */}
      <BrandFooter />

      {/* ─────────────────────────────────────────────────────────────
          TOAST NOTIFICATION OVERLAY
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-8 z-[300] bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2.5 text-xs font-bold"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MOUNTING UTILITY
// ─────────────────────────────────────────────────────────────
export const mountDashboard = (container) => {
  const mountPoint = container || document.getElementById("dashboard-stage-root") || document.querySelector('.dashboard-stage');
  if (!mountPoint) {
    console.warn("GymDeck: Dashboard mount container not found");
    return null;
  }

  const root = createRoot(mountPoint);
  root.render(<Dashboard />);
  return root;
};

// Backwards-compatible alias for existing script.js calls
export const mountDashboardWidgets = mountDashboard;

export default Dashboard;
