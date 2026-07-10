import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Activity, 
  Star, 
  IndianRupee, 
  Calendar, 
  UserCheck, 
  Clock, 
  Percent, 
  Search, 
  Download, 
  FileText, 
  Table as TableIcon, 
  Share2, 
  ChevronRight, 
  Filter, 
  MoreHorizontal, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  AlertCircle,
  Zap,
  Brain,
  LayoutDashboard,
  Target,
  ArrowLeft
} from "lucide-react";

/**
 * GYMDECK • TRAINER PERFORMANCE ANALYTICS
 * Enterprise Production-Grade Workforce Intelligence
 */

const TrainerPerformance = ({ onBack }) => {
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [filterDate, setFilterDate] = useState("Last 30 Days");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Mock Data for Workforce Intelligence
  const trainers = [
    { id: 1, name: "Rahul Sharma", spec: "Strength Coach", branch: "Indiranagar", sessions: 142, attendance: 98, retention: 92, revenue: 84500, rating: 4.9, score: 96, status: "High Performing" },
    { id: 2, name: "Priya Patel", spec: "Yoga Trainer", branch: "Koramangala", sessions: 128, attendance: 95, retention: 88, revenue: 62000, rating: 4.8, score: 91, status: "Stable Performance" },
    { id: 3, name: "Ankit Kumar", spec: "PT Trainer", branch: "HSR Layout", sessions: 156, attendance: 92, retention: 85, revenue: 92000, rating: 4.7, score: 89, status: "PT Revenue Spike" },
    { id: 4, name: "Sneha Reddy", spec: "Functional Trainer", branch: "BTM Layout", sessions: 94, attendance: 84, retention: 76, revenue: 41000, rating: 4.2, score: 74, status: "Attendance Risk" },
    { id: 5, name: "Manav Rao", spec: "Rehab Coach", branch: "Indiranagar", sessions: 110, attendance: 96, retention: 94, revenue: 58000, rating: 4.9, score: 93, status: "High Performing" },
    { id: 6, name: "Vikram Singh", spec: "Strength Coach", branch: "Koramangala", sessions: 135, attendance: 82, retention: 72, revenue: 78000, rating: 4.0, score: 68, status: "Performance Drop" },
  ];

  const kpis = [
    { label: "Total Active Trainers", value: "24", trend: "+2", icon: Users, color: "#6366F1" },
    { label: "PT Sessions Completed", value: "842", trend: "+12%", icon: Activity, color: "#10B981" },
    { label: "Avg Trainer Rating", value: "4.7", trend: "+0.2", icon: Star, color: "#F59E0B" },
    { label: "PT Revenue Generated", value: "₹8.42L", trend: "+18%", icon: IndianRupee, color: "#8B5CF6" },
    { label: "Trainer Attendance %", value: "94.2%", trend: "-1.5%", icon: Calendar, color: "#EF4444" },
    { label: "Client Retention Rate", value: "88%", trend: "+4%", icon: UserCheck, color: "#06B6D4" },
    { label: "Avg Session Completion", value: "96%", trend: "+2%", icon: Clock, color: "#EC4899" },
    { label: "Trainer Utilization %", value: "78%", trend: "+5%", icon: Percent, color: "#F97316" },
  ];

  const filteredTrainers = trainers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.spec.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.branch.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="trainer-performance-shell font-sans text-[#111827]">
      
      {/* 5. TOP UTILITY HEADER */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            <span>Reports & Analysis</span>
            <ChevronRight size={14} className="mx-2" />
            <span className="text-[#111827] font-bold font-sans">Trainer Performance</span>
          </nav>
        </div>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input 
              type="text" 
              placeholder="Search trainer, PT performance, branch..."
              className="w-full h-10 pl-10 pr-4 bg-slate-100 border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-[#111827] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-bold flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors">
            <Download size={18} />
            Export
          </button>
          <button className="h-10 px-6 rounded-lg bg-[#111827] text-white text-sm font-bold hover:bg-[#1F2937] transition-colors shadow-lg shadow-black/10">
            Generate Performance Report
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto">
        
        {/* 6. PAGE TITLE SECTION */}
        <section className="mb-2 flex items-end justify-between relative z-10">
          <div className="max-w-[760px]">
            <h1 className="text-3xl font-black tracking-tight mb-2 uppercase">Trainer Performance</h1>
            <p className="text-[#6B7280] text-xs font-semibold leading-relaxed">
              Analyze trainer productivity, PT effectiveness, attendance consistency, client engagement, and workforce performance across your fitness ecosystem.
            </p>
          </div>
          <div className="flex gap-2">
            {["PT Effectiveness", "Revenue Contribution", "Attendance Analytics", "Workforce Intelligence"].map(pill => (
              <span key={pill} className="px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-full text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                {pill}
              </span>
            ))}
          </div>
        </section>

        {/* 7. KPI ANALYTICS STRIP */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
          {kpis.map((kpi, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow cursor-default group"
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: kpi.color }}
                >
                  <kpi.icon size={20} />
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-bold ${kpi.trend.startsWith('+') ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {kpi.trend.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {kpi.trend.replace(/[+-]/, '')}
                </div>
              </div>
              <div className="text-[22px] font-black mb-1">{kpi.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors">{kpi.label}</div>
            </motion.div>
          ))}
        </section>

        <div className="trainer-performance-workspace">
          {/* 8. DATE FILTER & ANALYTICS CONTROL BAR */}
          <div className="trainer-performance-workspace-sticky-header">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1">
              {["Today", "Last 7 Days", "Last 30 Days", "Monthly", "Quarterly", "Annual"].map(opt => (
                <button 
                  key={opt}
                  onClick={() => setFilterDate(opt)}
                  className={`h-9 px-4 rounded-lg text-xs font-bold transition-all ${filterDate === opt ? 'bg-[#111827] text-white shadow-md' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                >
                  {opt}
                </button>
              ))}
              <div className="w-px h-6 bg-[#E5E7EB] mx-2" />
              <button className="h-9 px-4 rounded-lg text-xs font-bold text-[#6B7280] hover:bg-[#F3F4F6] flex items-center gap-2">
                <Calendar size={14} />
                Custom Range
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#F3F4F6] p-1 rounded-lg">
                {["PT Performance", "Revenue", "Attendance"].map(tab => (
                  <button key={tab} className="px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider text-[#4B5563] hover:text-[#111827]">
                    {tab}
                  </button>
                ))}
              </div>
              <button className="h-9 w-9 rounded-lg border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] hover:bg-[#F3F4F6]">
                <Filter size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 9. MAIN WORKSPACE STRUCTURE */}
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* 10. LEFT PANEL → FILTERS */}
          <aside className="col-span-2 sticky top-44 space-y-8">
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-4">Quick Filters</h3>
              <div className="space-y-2">
                {[
                  { label: "Top Performers", color: "#10B981" },
                  { label: "Attendance Drop", color: "#F59E0B" },
                  { label: "Low Engagement", color: "#EF4444" },
                  { label: "Revenue Leaders", color: "#8B5CF6" },
                  { label: "High Churn Risk", color: "#111827" },
                ].map(f => (
                  <button key={f.label} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white transition-all group">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                    <span className="text-xs font-bold text-[#4B5563] group-hover:text-[#111827]">{f.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-4">Trainer Categories</h3>
              <div className="space-y-1">
                {["Strength Coaches", "Cardio Trainers", "Rehab Coaches", "Yoga Trainers", "Senior PT Coaches", "Nutrition Consultants"].map(cat => (
                  <label key={cat} className="flex items-center gap-3 px-3 py-2 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-[#D1D5DB] text-[#111827] focus:ring-[#111827]" />
                    <span className="text-xs font-semibold text-[#4B5563] group-hover:text-[#111827]">{cat}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="bg-[#111827] rounded-2xl p-6 text-white overflow-hidden relative">
              <div className="relative z-10">
                <Brain className="text-[#A5B4FC] mb-4" size={24} />
                <h4 className="text-sm font-black mb-2">AI Optimization</h4>
                <p className="text-[11px] text-[#A5B4FC] leading-relaxed mb-4">
                  Predictive staffing suggests increasing Yoga Trainers by 15% for the evening slot.
                </p>
                <button className="text-[10px] font-black uppercase tracking-widest text-white underline underline-offset-4">
                  View Recommendations
                </button>
              </div>
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
            </section>
          </aside>

          {/* 11. CENTER WORKSPACE → MAIN ANALYTICS */}
          <main className="col-span-7 space-y-8">
            
            {/* SECTION 1 → CINEMATIC ANALYTICS GRAPH */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-lg font-black tracking-tight">Trainer Performance Overview</h2>
                  <p className="text-xs text-[#6B7280] font-medium">Aggregated productivity vs. target across all branches</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#6366F1]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Productivity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Revenue</span>
                  </div>
                </div>
              </div>

              {/* MOCK GRAPH AREA */}
              <div className="h-[380px] w-full relative group">
                {/* Background Grid */}
                <div className="absolute inset-0 flex flex-col justify-between py-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-full h-px bg-[#F3F4F6]" />
                  ))}
                </div>
                
                {/* SVG Area for Hybrid Graph */}
                <svg className="absolute inset-0 w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Area Overlay */}
                  <motion.path 
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    d="M 0,300 C 150,280 300,320 450,200 C 600,100 750,150 900,80 L 900,380 L 0,380 Z"
                    fill="url(#areaGrad)"
                  />

                  {/* Line Graph */}
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    d="M 0,300 C 150,280 300,320 450,200 C 600,100 750,150 900,80"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />

                  {/* Revenue Bars (Background) */}
                  {[20, 150, 280, 410, 540, 670, 800].map((x, i) => (
                    <motion.rect
                      key={i}
                      initial={{ height: 0, y: 380 }}
                      animate={{ height: [0, 100, 200, 150][i % 4], y: 380 - [0, 100, 200, 150][i % 4] }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      x={x}
                      width="12"
                      rx="4"
                      fill="#10B981"
                      fillOpacity="0.2"
                    />
                  ))}
                </svg>

                {/* Hover Interaction Indicator */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#6366F1] opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#6366F1]" />
                  <div className="absolute top-1/2 -left-32 -translate-y-1/2 bg-[#111827] text-white p-3 rounded-xl shadow-2xl text-[10px] w-28 pointer-events-none">
                    <div className="font-bold mb-1">MAY 18, 2026</div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[#9CA3AF]">Sessions:</span>
                      <span className="font-bold text-[#A5B4FC]">142</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9CA3AF]">Target:</span>
                      <span className="font-bold text-[#10B981]">110%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 → PERFORMANCE DISTRIBUTION */}
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#9CA3AF] mb-6">Performance Distribution</h3>
                <div className="flex items-center gap-8">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#F3F4F6" strokeWidth="3.5" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#10B981" strokeWidth="3.5" strokeDasharray="65, 100" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#F59E0B" strokeWidth="3.5" strokeDasharray="25, 100" strokeDashoffset="-65" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke="#EF4444" strokeWidth="3.5" strokeDasharray="10, 100" strokeDashoffset="-90" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black">24</span>
                      <span className="text-[8px] font-bold text-[#9CA3AF] uppercase">Trainers</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                        <span className="text-xs font-bold text-[#4B5563]">High Performers</span>
                      </div>
                      <span className="text-xs font-black text-[#111827]">65%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                        <span className="text-xs font-bold text-[#4B5563]">Average</span>
                      </div>
                      <span className="text-xs font-black text-[#111827]">25%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                        <span className="text-xs font-bold text-[#4B5563]">Low Performers</span>
                      </div>
                      <span className="text-xs font-black text-[#111827]">10%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#9CA3AF] mb-6">Execution Leaders</h3>
                <div className="space-y-4">
                  {[
                    { label: "Highest PT Revenue", name: "Ankit Kumar", value: "₹92,000", color: "#8B5CF6" },
                    { label: "Best Attendance", name: "Rahul Sharma", value: "98.8%", color: "#10B981" },
                  ].map((leader, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center font-bold text-[#111827]">
                        {leader.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-[#9CA3AF] mb-1">{leader.label}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#111827]">{leader.name}</span>
                          <span className="text-xs font-black" style={{ color: leader.color }}>{leader.value}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 3 → TRAINER PERFORMANCE TABLE */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black tracking-tight">Workforce Analytics Report</h3>
                  <p className="text-xs text-[#6B7280] font-medium">Detailed trainer evaluation across performance vectors</p>
                </div>
                <button className="text-xs font-bold text-[#6366F1] hover:underline">View All Trainers</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFB]">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] border-b border-[#E5E7EB]">Trainer</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] border-b border-[#E5E7EB]">Specialization</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] border-b border-[#E5E7EB]">PT Sessions</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] border-b border-[#E5E7EB]">Retention</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] border-b border-[#E5E7EB]">Revenue</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] border-b border-[#E5E7EB]">Score</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] border-b border-[#E5E7EB]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrainers.map((trainer) => (
                      <tr 
                        key={trainer.id} 
                        className="group hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                        onClick={() => setSelectedTrainer(trainer)}
                      >
                        <td className="px-8 py-5 border-b border-[#F3F4F6]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center text-white text-[11px] font-bold shadow-lg shadow-black/5">
                              {trainer.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[#111827] group-hover:text-[#6366F1] transition-colors">{trainer.name}</div>
                              <div className="text-[10px] font-semibold text-[#9CA3AF]">{trainer.branch}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 border-b border-[#F3F4F6]">
                          <span className="px-2.5 py-1 bg-[#F3F4F6] text-[#4B5563] text-[10px] font-bold rounded-md">
                            {trainer.spec}
                          </span>
                        </td>
                        <td className="px-6 py-5 border-b border-[#F3F4F6]">
                          <div className="text-sm font-bold text-[#111827]">{trainer.sessions}</div>
                          <div className="text-[9px] font-bold text-[#10B981]">+12% target</div>
                        </td>
                        <td className="px-6 py-5 border-b border-[#F3F4F6]">
                          <div className="text-sm font-bold text-[#111827]">{trainer.retention}%</div>
                          <div className="w-16 h-1 bg-[#F3F4F6] rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full bg-[#6366F1]" style={{ width: `${trainer.retention}%` }} />
                          </div>
                        </td>
                        <td className="px-6 py-5 border-b border-[#F3F4F6]">
                          <div className="text-sm font-bold text-[#111827]">₹{(trainer.revenue / 1000).toFixed(1)}K</div>
                        </td>
                        <td className="px-6 py-5 border-b border-[#F3F4F6]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-[#111827]">{trainer.score}</span>
                            <Star size={12} fill="#F59E0B" stroke="none" />
                          </div>
                        </td>
                        <td className="px-8 py-5 border-b border-[#F3F4F6]">
                          <div className="flex items-center justify-between gap-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest
                              ${trainer.status === "High Performing" ? 'text-[#10B981]' : 
                                trainer.status === "Attendance Risk" ? 'text-[#EF4444]' : 
                                trainer.status === "Performance Drop" ? 'text-[#F97316]' : 'text-[#8B5CF6]'}`}
                            >
                              {trainer.status}
                            </span>
                            <ChevronRight size={16} className="text-[#D1D5DB] group-hover:text-[#111827] group-hover:translate-x-1 transition-all" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-8 py-4 bg-[#F9FAFB] flex items-center justify-between">
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">Showing {filteredTrainers.length} of {trainers.length} results</div>
                <div className="flex gap-2">
                  <button className="h-8 w-8 rounded bg-white border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF] hover:text-[#111827]">
                    <ChevronRight size={14} className="rotate-180" />
                  </button>
                  <button className="h-8 w-8 rounded bg-[#111827] text-white flex items-center justify-center text-[10px] font-bold">1</button>
                  <button className="h-8 w-8 rounded bg-white border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF] hover:text-[#111827]">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* 13. RIGHT PANEL → AI & WORKFORCE INTELLIGENCE */}
          <aside className="col-span-3 sticky top-16 space-y-8">
            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">AI Insights</h3>
                <Zap size={16} className="text-[#8B5CF6]" />
              </div>
              <div className="space-y-4">
                {[
                  { text: "Trainer Ankit generated 28% higher PT revenue this quarter.", type: "success" },
                  { text: "Morning shift trainers show 12% lower engagement than evening shifts.", type: "warning" },
                  { text: "Predictive analysis: Yoga demand set to increase by 24% next month.", type: "info" }
                ].map((insight, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-[#F8FAF8] border border-[#F3F4F6]">
                    <AlertCircle size={16} className={`shrink-0 ${insight.type === 'success' ? 'text-[#10B981]' : insight.type === 'warning' ? 'text-[#F59E0B]' : 'text-[#6366F1]'}`} />
                    <p className="text-[11px] font-semibold leading-relaxed text-[#4B5563]">{insight.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF] mb-6">Live Trainer Status</h3>
              <div className="space-y-4">
                {[
                  { name: "Rahul Sharma", action: "PT Session Ongoing", room: "Studio A", time: "14m left" },
                  { name: "Priya Patel", action: "On Floor", room: "Cardio Zone", time: "Check-in 08:02" },
                  { name: "Vikram Singh", action: "Delayed Check-in", room: "Main Gym", time: "12m late", alert: true },
                ].map((status, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[10px] font-bold">
                          {status.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${status.alert ? 'bg-[#EF4444]' : 'bg-[#10B981]'}`} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#111827]">{status.name}</div>
                        <div className="text-[10px] font-semibold text-[#9CA3AF]">{status.action}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[10px] font-black uppercase ${status.alert ? 'text-[#EF4444]' : 'text-[#6B7280]'}`}>{status.time}</div>
                      <div className="text-[9px] font-bold text-[#9CA3AF]">{status.room}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF] mb-6">Workforce Forecasting</h3>
              <div className="h-32 w-full flex items-end gap-1 px-2 mb-4">
                {[40, 65, 85, 70, 45, 90, 60, 35, 75, 50].map((h, i) => (
                  <div key={i} className="flex-1 bg-[#6366F1]/10 rounded-t-sm relative group">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.05 }}
                      className="absolute bottom-0 inset-x-0 bg-[#6366F1] rounded-t-sm group-hover:bg-[#4F46E5] transition-colors"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-[#9CA3AF] px-1 uppercase tracking-wider">
                <span>06 AM</span>
                <span>02 PM</span>
                <span>10 PM</span>
              </div>
              <div className="mt-6 p-4 bg-[#F5F3FF] rounded-xl border border-[#DDD6FE]">
                <div className="flex items-center gap-2 mb-2 text-[#7C3AED]">
                  <TrendingUp size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Staffing Recommendation</span>
                </div>
                <p className="text-[11px] font-bold text-[#5B21B6] leading-tight">
                  Deploy 2 additional PTs between 06:00 PM – 08:30 PM to optimize utilization.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>

      {/* 12. TRAINER PERFORMANCE PROFILE DRAWER */}
      <AnimatePresence>
        {selectedTrainer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTrainer(null)}
              className="fixed inset-0 z-[1000] bg-[#0F172A]/40 backdrop-blur-sm"
            />
            <motion.aside 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 z-[1001] w-[560px] h-full bg-white shadow-2xl overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="sticky top-0 z-10 bg-white backdrop-blur-md border-b border-[#E5E7EB] px-8 py-6 flex items-center justify-between">
                <button 
                  onClick={() => setSelectedTrainer(null)}
                  className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors"
                >
                  <ArrowLeft size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">Back to Dashboard</span>
                </button>
                <button className="w-9 h-9 rounded-lg border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6]">
                  <Share2 size={18} />
                </button>
              </div>

              <div className="p-8">
                {/* 12.1 TRAINER SUMMARY */}
                <header className="flex items-center gap-6 mb-12">
                  <div className="w-24 h-24 rounded-3xl bg-[#111827] flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-black/20">
                    {selectedTrainer.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-black tracking-tight">{selectedTrainer.name}</h2>
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md bg-[#F3F4F6]
                        ${selectedTrainer.status === "High Performing" ? 'text-[#10B981]' : 'text-[#8B5CF6]'}`}>
                        {selectedTrainer.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-[#6B7280]">
                      <span className="flex items-center gap-1.5"><Zap size={14} className="text-[#6366F1]" /> {selectedTrainer.spec}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
                      <span>{selectedTrainer.branch}</span>
                    </div>
                  </div>
                </header>

                <div className="grid grid-cols-2 gap-4 mb-12">
                  <div className="bg-[#F8FAF8] rounded-2xl p-5 border border-[#F3F4F6]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-4">Analytics Score</div>
                    {/* 14. RADIAL ANALYTICS SCORE */}
                    <div className="flex items-center gap-6">
                      <div className="relative w-20 h-20">
                        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                          <motion.circle 
                            initial={{ strokeDasharray: "0, 100" }}
                            animate={{ strokeDasharray: `${selectedTrainer.score}, 100` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="18" cy="18" r="16" fill="none" stroke="#6366F1" strokeWidth="4" 
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-black">{selectedTrainer.score}</div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-[#111827] mb-1">Excellent Range</div>
                        <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed">Top 5% of workforce based on 8 core vectors.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#F8FAF8] rounded-2xl p-5 border border-[#F3F4F6]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-4">Utilization</div>
                    <div className="text-3xl font-black text-[#111827] mb-1">84%</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#10B981]">
                      <ArrowUpRight size={14} /> +12% Efficiency
                    </div>
                  </div>
                </div>

                {/* 12.2 PERFORMANCE METRICS */}
                <section className="space-y-8">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-6">Execution Analytics</h3>
                    <div className="space-y-6">
                      {[
                        { label: "PT Sessions Completed", value: selectedTrainer.sessions, sub: "14 target remaining", color: "#6366F1", p: 85 },
                        { label: "Attendance Consistency", value: `${selectedTrainer.attendance}%`, sub: "0 delayed check-ins", color: "#10B981", p: 98 },
                        { label: "Client Retention Score", value: `${selectedTrainer.retention}%`, sub: "9 active PT renewals", color: "#8B5CF6", p: 92 },
                        { label: "Avg Session Quality", value: selectedTrainer.rating, sub: "Based on 42 reviews", color: "#F59E0B", p: 94 },
                      ].map((m, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-xs font-black text-[#111827]">{m.label}</div>
                              <div className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider">{m.sub}</div>
                            </div>
                            <div className="text-sm font-black" style={{ color: m.color }}>{m.value}</div>
                          </div>
                          <div className="w-full h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${m.p}%` }}
                              transition={{ duration: 1, delay: i * 0.1 }}
                              className="h-full rounded-full" 
                              style={{ backgroundColor: m.color }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 12.3 REVENUE ANALYTICS */}
                  <div className="p-6 rounded-2xl bg-[#111827] text-white">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-[#A5B4FC]">Profitability Contribution</div>
                        <h4 className="text-lg font-black">₹{(selectedTrainer.revenue / 1000).toFixed(1)}K Monthly</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-[#10B981]">↑ 18.2%</div>
                        <div className="text-[8px] font-bold text-[#A5B4FC] uppercase tracking-widest">Growth vs Apr</div>
                      </div>
                    </div>
                    <div className="h-20 w-full flex items-end gap-1 px-1">
                      {[30, 45, 35, 60, 55, 80, 75, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-white/10 rounded-t-[2px] relative group">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: 1 + i * 0.05 }}
                            className="absolute bottom-0 inset-x-0 bg-[#A5B4FC] rounded-t-[2px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 12.6 INTERNAL NOTES */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-4">Operational Intelligence</h3>
                    <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={14} className="text-[#6B7280]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#4B5563]">Manager Observations</span>
                      </div>
                      <p className="text-[11px] font-bold text-[#4B5563] leading-relaxed italic">
                        "Strong PT retention among evening batch clients. Highly specialized in powerlifting; recommended for advanced strength training lead generation."
                      </p>
                    </div>
                  </div>
                </section>

                <div className="mt-12 flex gap-3">
                  <button className="flex-1 h-12 rounded-xl bg-[#111827] text-white text-xs font-black uppercase tracking-widest hover:bg-[#1F2937] transition-all shadow-xl shadow-black/10">
                    Generate Full Report
                  </button>
                  <button className="h-12 px-6 rounded-xl border border-[#E5E7EB] text-xs font-black uppercase tracking-widest text-[#4B5563] hover:bg-[#F9FAFB] transition-all">
                    Schedule Review
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNT UTILITY
// ─────────────────────────────────────────
export function mountTrainerPerformance(container) {
  const root = createRoot(container);
  
  const handleBack = () => {
    // This is handled by script.js setActiveView
  };

  root.render(<><TrainerPerformance onBack={handleBack} /><BrandFooter /></>);
}

export default TrainerPerformance;
