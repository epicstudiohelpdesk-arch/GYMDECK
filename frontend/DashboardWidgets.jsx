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
  ArrowUpRight, 
  ShieldCheck, 
  Wifi, 
  RotateCcw, 
  Sliders, 
  Calendar, 
  Bell, 
  TrendingUp, 
  RefreshCw,
  Gauge
} from "lucide-react";
import BrandFooter from "./BrandFooter.jsx";

/**
 * GYMDECK • EXECUTIVE COMMAND CENTER
 * Professional Light Theme (Enterprise SaaS Standard)
 * Precision 5-Card Layout Faithfully Matched to Wireframe Architecture
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
    morning: { count: 68, max: 80, pct: 85, label: "Morning Shift", sub: "Peak: 08:30" },
    live: { count: 43, max: 60, pct: 74, label: "Live Headcount", sub: "Peak in 38m" },
    evening: { count: 87, max: 90, pct: 96, label: "Evening Shift", sub: "Capacity Limit" }
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
      capacityMax: "/ 60",
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
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-blue-600 selection:text-white flex flex-col pb-8">
      
      {/* ─────────────────────────────────────────────────────────────
          TOP EXECUTIVE OPERATIONS BAR
      ───────────────────────────────────────────────────────────── */}
      <header className="px-5 py-2 border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        
        {/* Search Operations */}
        <div className="relative flex-1 min-w-[260px] max-w-lg">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members, dues, check-ins, floor telemetry... (Press / to focus)"
            className="w-full h-8 pl-8.5 pr-10 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all font-normal"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-200/60 text-slate-500 border border-slate-300/80 pointer-events-none">
            /
          </kbd>
        </div>

        {/* Status Indicators & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Shift & Date Pill */}
          <div className="h-7.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
            <Calendar size={12} className="text-blue-600" />
            <span>Fri, 06 Nov • Evening Shift</span>
          </div>

          {/* Sync Status Badge */}
          <div 
            onClick={handleForceSync}
            className="h-7.5 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100/60 cursor-pointer flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 transition-colors"
            title="Click to trigger instant biometric & cloud sync"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cloud Synced</span>
          </div>

          {/* Refresh Action */}
          <button 
            type="button"
            onClick={() => showToast("Floor telemetry refreshed.")}
            className="w-7.5 h-7.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw size={12} />
          </button>

          {/* Notifications */}
          <button 
            type="button"
            onClick={() => showToast("No urgent manager escalations.")}
            className="w-7.5 h-7.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer relative"
            title="Alerts"
          >
            <Bell size={12} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MASTER 5-CARD WIREFRAME GRID (Executive Precision Edition)
          Row 1: Card 1 (Span 8) + Card 2 (Span 4)
          Row 2: Card 3 (Span 5) + Card 4 (Span 3) + Card 5 (Span 4)
      ───────────────────────────────────────────────────────────── */}
      <main className="p-4 max-w-[1560px] w-full mx-auto space-y-3">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

          {/* ══════════════════════════════════════════════════════════
              CARD 1: TOP-LEFT HERO ANALYTICS & OPERATIONS PULSE
              (Wireframe: 1 pill top-left, 4 pills top-right, large canvas)
          ══════════════════════════════════════════════════════════ */}
          <section className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative flex flex-col justify-between min-h-[310px]">
            
            {/* Header: Clean Title with Icon + 4 Timeframe Segmented Tabs (Matching Wireframe!) */}
            <div className="flex items-center justify-between gap-3 relative z-10 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60">
                  <Activity size={13} />
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    Live Command Pulse
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  </h2>
                </div>
              </div>

              {/* Timeframe Segmented Control (Matching Wireframe: 4 Tabs in a Row!) */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/70">
                {["24H", "7D", "30D", "1Y"].map((tf) => {
                  const isSelected = timeframe === tf;
                  return (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-medium transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-white text-slate-900 shadow-xs font-semibold" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics High-Level Overlay: 3 Executive KPIs */}
            <div className="grid grid-cols-3 gap-2.5 my-1.5 relative z-10">
              
              {/* Metric 1 */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Floor Headcount
                  </span>
                  <span className="text-[9.5px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100/60">
                    {currentHero.capacityPct}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-semibold tracking-tight text-slate-900">{currentHero.capacity}</span>
                  <span className="text-xs font-medium text-slate-400">{currentHero.capacityMax}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">Safe threshold 60</span>
              </div>

              {/* Metric 2 */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Inflow Collections
                  </span>
                  <span className="text-[9.5px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100/60">
                    {currentHero.collectionsDelta}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-xl font-semibold tracking-tight text-slate-900">{currentHero.collections}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">Daily run-rate target</span>
              </div>

              {/* Metric 3 */}
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Turnstile Check-ins
                  </span>
                  <span className="text-[9.5px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                    {currentHero.checkinsDelta}
                  </span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-xl font-semibold tracking-tight text-slate-900">{currentHero.checkins}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">Peak hour: 18:00 (87)</span>
              </div>

            </div>

            {/* ─── Large Interactive Telemetry Canvas with Professional Graphing ─── */}
            <div className="w-full flex-1 min-h-[135px] relative z-10 flex flex-col justify-end">
              
              <div className="relative w-full h-28 flex gap-1.5">
                {/* Y-Axis Reference Scale (Clean HTML typography) */}
                <div className="w-5 h-full flex flex-col justify-between text-[8.5px] font-mono text-slate-400 select-none pb-1 shrink-0 text-right pr-0.5">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>0</span>
                </div>

                {/* SVG Graph Canvas */}
                <div className="relative flex-1 h-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 660 110" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="execAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.14" />
                        <stop offset="60%" stopColor="#2563eb" stopOpacity="0.04" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guide Gridlines with Precise Alignment */}
                    <line x1="0" y1="12" x2="660" y2="12" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="0" y1="42" x2="660" y2="42" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="0" y1="74" x2="660" y2="74" stroke="#f1f5f9" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="0" y1="105" x2="660" y2="105" stroke="#e2e8f0" strokeWidth="1" />

                    {/* Area Gradient Fill under Primary Spline */}
                    <path
                      d="M 0,82 C 90,75 150,38 230,48 C 310,58 380,68 450,56 C 510,44 560,14 600,16 C 630,18 650,50 660,56 L 660,105 L 0,105 Z"
                      fill="url(#execAreaGrad)"
                    />

                    {/* Secondary Benchmark Curve (Previous Period - Dashed Slate Line) */}
                    <path
                      d="M 0,94 C 90,88 150,60 230,65 C 310,70 380,82 450,72 C 510,62 560,34 600,32 C 630,30 650,65 660,68"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />

                    {/* Primary Spline Line (Current Period - Solid Blue Curve) */}
                    <path
                      d="M 0,82 C 90,75 150,38 230,48 C 310,58 380,68 450,56 C 510,44 560,14 600,16 C 630,18 650,50 660,56"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Vertical Guideline at Peak (18:00) */}
                    <line x1="600" y1="16" x2="600" y2="105" stroke="#94a3b8" strokeDasharray="2 2" strokeWidth="1" />

                    {/* Key Peak Precision Radar Node */}
                    <g transform="translate(600, 16)">
                      <circle r="7" fill="none" stroke="rgba(37,99,235,0.25)" className="animate-ping" />
                      <circle r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  </svg>

                  {/* Floating Precision Tooltip Badge at Peak */}
                  <div 
                    className="absolute pointer-events-none"
                    style={{ top: "-4px", right: "24px" }}
                  >
                    <div className="bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded-md shadow-md flex items-center gap-1.5 border border-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>18:00 Peak • 87 Check-ins (+24%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* X-Axis Time Labels & Legend */}
              <div className="flex justify-between items-center text-[9.5px] text-slate-400 pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-blue-600 rounded-full" />
                    <span className="text-slate-600 font-medium">Today</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 border-t border-dashed border-slate-400" />
                    <span className="text-slate-400">Baseline</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 font-mono">
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
          <section className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative flex flex-col justify-between min-h-[310px]">
            
            {/* Header: Title + Status Pill (Matching Wireframe!) */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6.5 h-6.5 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200/60">
                  <Users size={13} />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Active Roster & Queue
                </h3>
              </div>

              <div className="h-5.5 px-2 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-[9.5px] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>3 Pending</span>
              </div>
            </div>

            {/* Item 1: Circle avatar + 2 lines + right status (Matching Wireframe!) */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-7.5 h-7.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center">
                  AK
                </div>
                <div>
                  <h4 className="text-[11.5px] font-semibold text-slate-900 leading-tight">Ankit Kumar</h4>
                  <p className="text-[10px] text-slate-500 font-normal">Head Coach • 4 PT Sessions</p>
                </div>
              </div>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[9.5px] font-medium uppercase tracking-wide">
                On Floor
              </span>
            </div>

            {/* Item 2: Circle avatar + 2 lines + right status (Matching Wireframe!) */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 transition-colors mt-1">
              <div className="flex items-center gap-2">
                <div className="w-7.5 h-7.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center">
                  SP
                </div>
                <div>
                  <h4 className="text-[11.5px] font-semibold text-slate-900 leading-tight">Sneha Patel</h4>
                  <p className="text-[10px] text-slate-500 font-normal">Nutrition Consult • 2 Clients</p>
                </div>
              </div>
              <span className="px-1.5 py-0.2 rounded-md bg-slate-100 border border-slate-200/80 text-slate-600 text-[9.5px] font-medium tracking-wide">
                7:30 PM
              </span>
            </div>

            {/* ─── FEATURED ITEM 3: PROMINENT HARDWARE TURNSTILE CONTROLLER IN WIREFRAME! ─── */}
            <div 
              onClick={() => {
                const nextState = !autoGateActive;
                setAutoGateActive(nextState);
                showToast(nextState ? "Auto-Turnstile Gate: ACTIVE (RFID auto-accept)" : "Turnstile Gate switched to MANUAL check-in.");
              }}
              className="my-1 p-2 rounded-xl bg-slate-50/90 hover:bg-slate-100/80 border border-slate-200/90 transition-all cursor-pointer select-none flex items-center justify-between group"
              title="Click to toggle between Auto-Turnstile Pass and Manual Gate"
            >
              <div className="flex items-center gap-2">
                <div className="w-6.5 h-6.5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60">
                  <Wifi size={12} />
                </div>
                <div>
                  <span className="text-[11.5px] font-semibold text-slate-900 block leading-tight">
                    {autoGateActive ? "Auto-Turnstile Gate" : "Manual Gate Pass"}
                  </span>
                  <span className="text-[9.5px] text-slate-500 font-normal">
                    {autoGateActive ? "43 Passes Auto-Verified Today" : "Manual Staff Override"}
                  </span>
                </div>
              </div>

              {/* iOS-Style Toggle Switch */}
              <div className="flex items-center gap-1.5">
                <span className={`text-[9.5px] font-semibold tracking-wide ${autoGateActive ? "text-blue-600" : "text-slate-400"}`}>
                  {autoGateActive ? "ONLINE" : "OFF"}
                </span>
                <div className={`w-7.5 h-4 rounded-full p-0.5 transition-colors ${autoGateActive ? "bg-blue-600" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-3 h-3 rounded-full bg-white shadow-xs"
                    animate={{ x: autoGateActive ? 14 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* Item 4: Circle avatar + 2 lines + right status (Matching Wireframe!) */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 transition-colors mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7.5 h-7.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center">
                  RV
                </div>
                <div>
                  <h4 className="text-[11.5px] font-semibold text-slate-900 leading-tight">Rohan Verma</h4>
                  <p className="text-[10px] text-slate-500 font-normal">Indiranagar • Annual Member</p>
                </div>
              </div>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[9.5px] font-medium uppercase tracking-wide">
                Checked In
              </span>
            </div>

            {/* ─── ITEM 5: BOTTOM ACTION BUTTON (Matching Wireframe!) ─── */}
            <button
              type="button"
              onClick={handleOpenAddMember}
              className="w-full h-8.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
            >
              <UserPlus size={13} />
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
          <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative flex flex-col justify-between min-h-[290px]">
            
            {/* Header: Title & Subtitle on Left + Forecast Switch on Right (Matching Wireframe!) */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/60">
                    <TrendingUp size={12} />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Collections Trajectory
                  </h3>
                </div>
                <p className="text-[10.5px] text-slate-500 mt-0.5 pl-7.5">
                  Target: ₹9,00,000 • <span className="text-emerald-600 font-semibold">93.5% Pace</span>
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
                <span className="text-[9.5px] font-medium uppercase tracking-wider text-slate-400">Forecast</span>
                <div className={`w-7.5 h-4 rounded-full p-0.5 transition-colors ${forecastActive ? "bg-blue-600" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-3 h-3 rounded-full bg-white shadow-xs"
                    animate={{ x: forecastActive ? 14 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* Canvas Area with TWO CALLOUT PINS WITH LEADER LINES (Directly from Wireframe!) */}
            <div className="relative w-full h-32 my-1">
              
              {/* Telemetry Line Chart Background SVG */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 480 110" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="trajAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                <line x1="0" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="58" x2="480" y2="58" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="95" x2="480" y2="95" stroke="#e2e8f0" strokeWidth="1" />

                {/* Target Dashed Line if Forecast is ON */}
                {forecastActive && (
                  <line 
                    x1="0" y1="30" x2="480" y2="30" 
                    stroke="#94a3b8" 
                    strokeWidth="1.2" 
                    strokeDasharray="5 4" 
                  />
                )}

                {/* Soft Area Gradient */}
                {seriesToggles.collections && (
                  <path
                    d="M 15,92 C 80,88 130,38 190,38 C 250,38 280,75 350,75 C 400,75 435,24 470,24 L 470,95 L 15,95 Z"
                    fill="url(#trajAreaGrad)"
                  />
                )}

                {/* Trajectory Main Curve (Collections) */}
                {seriesToggles.collections && (
                  <path
                    d="M 15,92 C 80,88 130,38 190,38 C 250,38 280,75 350,75 C 400,75 435,24 470,24"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}

                {/* Leader line for Pin 1 */}
                <line x1="190" y1="20" x2="190" y2="38" stroke="#10b981" strokeWidth="1.2" strokeDasharray="2 2" />

                {/* Peak Point Node (under Pin 1) */}
                <g transform="translate(190, 38)">
                  <circle r="4" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                </g>

                {/* Leader line for Pin 2 */}
                <line x1="350" y1="75" x2="350" y2="92" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="2 2" />

                {/* Dip Point Node (under Pin 2) */}
                <g transform="translate(350, 75)">
                  <circle r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                </g>
              </svg>

              {/* ─── CALLOUT PIN 1: TOP-LEFT PEAK (Matching Wireframe!) ─── */}
              <div 
                className="absolute pointer-events-auto"
                style={{ top: "0px", left: "39.58%", transform: "translateX(-50%)", zIndex: 10 }}
              >
                <div className="px-2 py-0.5 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200/90 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-slate-900 leading-none">₹8,42,000</span>
                  <span className="text-[9px] text-emerald-600 font-medium">Peak (+18%)</span>
                </div>
              </div>

              {/* ─── CALLOUT PIN 2: BOTTOM-RIGHT DIP (Matching Wireframe!) ─── */}
              <div 
                className="absolute pointer-events-auto"
                style={{ bottom: "0px", left: "72.9%", transform: "translateX(-50%)", zIndex: 10 }}
              >
                <div className="px-2 py-0.5 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200/90 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-semibold text-slate-900 leading-none">₹64,500</span>
                  <span className="text-[9px] text-amber-600 font-medium">12 Overdue</span>
                </div>
              </div>

            </div>

            {/* ─── BOTTOM ROW: 3 TOGGLE SWITCHES IN A ROW (Matching Wireframe!) ─── */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
              
              {/* Switch 1: Collections */}
              <div 
                onClick={() => setSeriesToggles({ ...seriesToggles, collections: !seriesToggles.collections })}
                className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 cursor-pointer select-none flex-1 transition-colors"
              >
                <div className="flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[10.5px] font-medium text-slate-700 truncate">Collections</span>
                </div>
                <div className={`w-5.5 h-3.2 rounded-full p-0.5 transition-colors ${seriesToggles.collections ? "bg-emerald-500" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-2.2 h-2.2 rounded-full bg-white shadow-xs"
                    animate={{ x: seriesToggles.collections ? 9 : 0 }}
                  />
                </div>
              </div>

              {/* Switch 2: Renewals */}
              <div 
                onClick={() => setSeriesToggles({ ...seriesToggles, renewals: !seriesToggles.renewals })}
                className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 cursor-pointer select-none flex-1 transition-colors"
              >
                <div className="flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  <span className="text-[10.5px] font-medium text-slate-700 truncate">Renewals</span>
                </div>
                <div className={`w-5.5 h-3.2 rounded-full p-0.5 transition-colors ${seriesToggles.renewals ? "bg-blue-600" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-2.2 h-2.2 rounded-full bg-white shadow-xs"
                    animate={{ x: seriesToggles.renewals ? 9 : 0 }}
                  />
                </div>
              </div>

              {/* Switch 3: Overdue */}
              <div 
                onClick={() => setSeriesToggles({ ...seriesToggles, dues: !seriesToggles.dues })}
                className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 cursor-pointer select-none flex-1 transition-colors"
              >
                <div className="flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[10.5px] font-medium text-slate-700 truncate">Overdue</span>
                </div>
                <div className={`w-5.5 h-3.2 rounded-full p-0.5 transition-colors ${seriesToggles.dues ? "bg-amber-500" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-2.2 h-2.2 rounded-full bg-white shadow-xs"
                    animate={{ x: seriesToggles.dues ? 9 : 0 }}
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
          <section className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative flex flex-col justify-between min-h-[290px]">
            
            {/* Header: Title on Left + Online Indicator on Right (Matching Wireframe!) */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60">
                  <Zap size={12} />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  System Sync
                </h3>
              </div>

              <span className="px-2 py-0.2 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[9.5px] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>99.8%</span>
              </span>
            </div>

            {/* Sync Telemetry Details */}
            <div className="my-1 space-y-1.5">
              <div className="p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium mb-1">
                  <span>SQLite Buffer Health</span>
                  <span className="text-slate-900 font-semibold font-mono">42 / 500 Queue</span>
                </div>
                <div className="w-full h-1.2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-[92%]" />
                </div>
              </div>

              <div className="space-y-1 pl-0.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700 font-normal">
                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                  <span>2 Biometric turnstiles linked</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 font-normal">
                  <Clock size={12} className="text-slate-400 shrink-0" />
                  <span>Cloud handshake: 32s ago</span>
                </div>
              </div>
            </div>

            {/* ─── SUB-SECTION: TWO LINES + TOGGLE SWITCH ON RIGHT (Matching Wireframe!) ─── */}
            <div className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-2">
              <div>
                <h4 className="text-[11.5px] font-semibold text-slate-900 leading-tight">Auto-Sync Daemon</h4>
                <p className="text-[10px] text-slate-500 mt-0.2 font-normal">&lt; 40ms local failover pipe</p>
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
              className="h-8.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 flex items-center justify-between px-3 cursor-pointer select-none transition-all group active:scale-[0.99]"
              title="Click to force immediate sync"
            >
              <div className="flex items-center gap-2">
                <RefreshCw size={11} className={`text-slate-600 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
                <span className="text-[11px] font-semibold text-slate-800">
                  {isSyncing ? "Syncing..." : "Force Instant Sync"}
                </span>
              </div>
              <span className="text-[10.5px] font-medium text-blue-600 group-hover:translate-x-0.5 transition-transform">
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
          <section className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative flex flex-col justify-between min-h-[290px]">
            
            {/* Header: Two Lines on Left + Toggle Switch on Right (Matching Wireframe!) */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60">
                    <Gauge size={12} />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Live Occupancy
                  </h3>
                </div>
                <p className="text-[10.5px] text-slate-500 font-normal mt-0.5 pl-7.5">
                  Capacity: <strong className="text-slate-900 font-semibold">{activeOccupancy.count}</strong> / {activeOccupancy.max} Members
                </p>
              </div>

              {/* Right Toggle Switch (Matching Wireframe!) */}
              <div 
                onClick={() => {
                  setSensorsLive(!sensorsLive);
                  showToast(!sensorsLive ? "Occupancy sensors connected." : "Occupancy sensors paused.");
                }}
                className="flex items-center gap-1.5 cursor-pointer select-none"
                title="Toggle Sensor Feed"
              >
                <span className="text-[9.5px] font-medium uppercase tracking-wider text-slate-400">Sensors</span>
                <div className={`w-7.5 h-4 rounded-full p-0.5 transition-colors ${sensorsLive ? "bg-blue-600" : "bg-slate-300"}`}>
                  <motion.div 
                    className="w-3 h-3 rounded-full bg-white shadow-xs"
                    animate={{ x: sensorsLive ? 14 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </div>

            {/* ─── CENTER: THE ORBITAL RADIAL DIAL & GAUGE (Matching Wireframe!) ─── */}
            <div className="relative w-full flex items-center justify-center py-0.5">
              <div className="relative w-32 h-32 flex items-center justify-center">
                
                {/* SVG Orbital Track & Radial Gauge */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 176 176">
                  <defs>
                    <linearGradient id="orbitalArcGradLight" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>

                  {/* Outer Fine Track Ring (Matching Wireframe!) */}
                  <circle
                    cx="88" cy="88" r="82"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* Inner Track Background */}
                  <circle
                    cx="88" cy="88" r="64"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="8"
                  />

                  {/* Inner Glowing Progress Arc */}
                  <motion.circle
                    cx="88" cy="88" r="64"
                    fill="none"
                    stroke="url(#orbitalArcGradLight)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="402"
                    animate={{ strokeDashoffset: 402 - (402 * activeOccupancy.pct) / 100 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </svg>

                {/* Orbiting Beacon Dot along Outer Track */}
                <motion.div 
                  className="absolute inset-0 pointer-events-none"
                  animate={{ rotate: sensorsLive ? 360 : 45 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs border-2 border-white" />
                </motion.div>

                {/* Center Dial Core Information (Matching Wireframe!) */}
                <div className="text-center z-10 flex flex-col items-center">
                  <span className="text-[9.5px] font-medium uppercase tracking-wider text-slate-400 leading-none">
                    {activeOccupancy.pct}% Load
                  </span>
                  <span className="text-2xl font-semibold text-slate-900 tracking-tight my-0.5 leading-none">
                    {activeOccupancy.count}
                  </span>
                  <span className="text-[9.5px] font-medium text-blue-600">
                    Inside Floor
                  </span>
                </div>
              </div>
            </div>

            {/* ─── BOTTOM CONTROLS: CENTRAL KNOB FLANKED BY 2 PILLS (Directly from Wireframe!) ─── */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 select-none">
              
              {/* Left Pill: Morning */}
              <button
                type="button"
                onClick={() => setOccupancyShift("morning")}
                className={`h-6.5 px-2.5 rounded-lg text-[10.5px] font-medium transition-all cursor-pointer ${
                  occupancyShift === "morning"
                    ? "bg-slate-900 text-white shadow-xs font-semibold"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
                }`}
              >
                Morning 68
              </button>

              {/* Center Circular Knob / Live Button (Matching Wireframe!) */}
              <button
                type="button"
                onClick={() => setOccupancyShift("live")}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                  occupancyShift === "live"
                    ? "bg-blue-600 text-white ring-4 ring-blue-500/20 scale-105"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200/80"
                }`}
                title="Switch to Live Headcount"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
              </button>

              {/* Right Pill: Evening */}
              <button
                type="button"
                onClick={() => setOccupancyShift("evening")}
                className={`h-6.5 px-2.5 rounded-lg text-[10.5px] font-medium transition-all cursor-pointer ${
                  occupancyShift === "evening"
                    ? "bg-slate-900 text-white shadow-xs font-semibold"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
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
            className="fixed bottom-6 right-8 z-[300] bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-800 flex items-center gap-2 text-xs font-medium"
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
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
