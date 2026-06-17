import React from "react";
import { Activity, Zap, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

export const AttendanceWidget = () => (
  <section className="side-panel attendance-panel bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
    <div className="flex justify-between items-start mb-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Occupancy</span>
        <h2 className="text-lg font-black text-slate-900 mt-1">Capacity used</h2>
      </div>
      <strong className="text-indigo-600 text-xl font-black">74%</strong>
    </div>
    <div className="flex flex-col items-center justify-center py-6 border-y border-slate-50 mb-6">
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="64" cy="64" r="58" fill="none" stroke="#f1f5f9" strokeWidth="12" />
          <motion.circle 
            cx="64" cy="64" r="58" fill="none" stroke="#6366f1" strokeWidth="12" 
            strokeDasharray="364.4"
            initial={{ strokeDashoffset: 364.4 }}
            animate={{ strokeDashoffset: 364.4 * 0.26 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center">
          <strong className="block text-3xl font-black text-slate-900">43</strong>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Inside</span>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
        <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Morning</span>
        <strong className="text-xs font-black text-slate-700">68</strong>
      </div>
      <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
        <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">After</span>
        <strong className="text-xs font-black text-slate-700">31</strong>
      </div>
      <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
        <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Evening</span>
        <strong className="text-xs font-black text-slate-700">87</strong>
      </div>
    </div>
  </section>
);

export const SyncWidget = () => (
  <section className="side-panel sync-panel bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-4">
    <div className="flex justify-between items-start mb-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Local System</span>
        <h2 className="text-lg font-black text-slate-900 mt-1">Sync status</h2>
      </div>
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Online
      </span>
    </div>
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black text-slate-500 uppercase">Data Integrity</span>
          <strong className="text-xs font-black text-slate-900">97%</strong>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-600" 
            initial={{ width: 0 }}
            animate={{ width: "97%" }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-slate-500">
          <Zap size={14} className="text-indigo-500" />
          <span className="text-[11px] font-bold">42 records queued locally</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <CheckCircle2 size={14} className="text-emerald-500" />
          <span className="text-[11px] font-bold">2 devices pending handshake</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <Clock size={14} className="text-slate-400" />
          <span className="text-[11px] font-bold">11:28 PM last successful sync</span>
        </div>
      </div>
    </div>
  </section>
);

export const TaskWidget = () => (
  <section className="side-panel task-panel bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-4">
    <div className="mb-6">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manager Queue</span>
      <h2 className="text-lg font-black text-slate-900 mt-1">Priority actions</h2>
    </div>
    <div className="space-y-3">
      {[
        "Call 8 annual members for renewals",
        "Verify 5 uploaded ID proofs",
        "Assign trainer for 3 PT trials"
      ].map((task, i) => (
        <label key={i} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all cursor-pointer group">
          <input type="checkbox" className="w-4.5 h-4.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500" />
          <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{task}</span>
        </label>
      ))}
    </div>
  </section>
);

import { createRoot } from "react-dom/client";

export const mountDashboardWidgets = () => {
  const container = document.querySelector('.operations-rightbar');
  if (!container) return;

  const rootElement = document.createElement("div");
  rootElement.className = "space-y-4";
  container.replaceChildren(rootElement);

  createRoot(rootElement).render(
    <>
      <AttendanceWidget />
      <SyncWidget />
      <TaskWidget />
    </>
  );
};
