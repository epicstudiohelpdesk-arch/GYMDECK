import React from "react";
import { Activity, Zap, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";

export const AttendanceWidget = () => (
  <section className="side-panel attendance-panel bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
    <div className="flex justify-between items-start mb-2.5">
      <div>
        <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">Live Occupancy</span>
        <h2 className="text-sm font-black text-slate-900 mt-0.5">Capacity used</h2>
      </div>
      <strong className="text-indigo-600 text-base font-black">74%</strong>
    </div>
    <div className="flex flex-col items-center justify-center py-2 border-y border-slate-100 mb-2.5">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <motion.circle 
            cx="40" cy="40" r="34" fill="none" stroke="#6366f1" strokeWidth="8" 
            strokeDasharray="213.6"
            initial={{ strokeDashoffset: 213.6 }}
            animate={{ strokeDashoffset: 213.6 * 0.26 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center">
          <strong className="block text-xl font-black text-slate-900 leading-none">43</strong>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-0.5 block">Inside</span>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-1.5">
      <div className="text-center p-1.5 rounded-lg bg-slate-50 border border-slate-100">
        <span className="block text-[8.5px] font-black text-slate-400 uppercase mb-0.5">Morning</span>
        <strong className="text-xs font-black text-slate-700">68</strong>
      </div>
      <div className="text-center p-1.5 rounded-lg bg-slate-50 border border-slate-100">
        <span className="block text-[8.5px] font-black text-slate-400 uppercase mb-0.5">After</span>
        <strong className="text-xs font-black text-slate-700">31</strong>
      </div>
      <div className="text-center p-1.5 rounded-lg bg-slate-50 border border-slate-100">
        <span className="block text-[8.5px] font-black text-slate-400 uppercase mb-0.5">Evening</span>
        <strong className="text-xs font-black text-slate-700">87</strong>
      </div>
    </div>
  </section>
);

export const SyncWidget = () => (
  <section className="side-panel sync-panel bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm mt-2.5">
    <div className="flex justify-between items-start mb-2.5">
      <div>
        <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">Local System</span>
        <h2 className="text-sm font-black text-slate-900 mt-0.5">Sync status</h2>
      </div>
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9.5px] font-black uppercase tracking-wider border border-emerald-100">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Online
      </span>
    </div>
    <div className="space-y-2.5">
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[9.5px] font-black text-slate-500 uppercase">Data Integrity</span>
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
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5 text-slate-500">
          <Zap size={13} className="text-indigo-500 shrink-0" />
          <span className="text-[10.5px] font-bold">42 records queued locally</span>
        </div>
        <div className="flex items-center gap-2.5 text-slate-500">
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
          <span className="text-[10.5px] font-bold">2 devices pending handshake</span>
        </div>
        <div className="flex items-center gap-2.5 text-slate-500">
          <Clock size={13} className="text-slate-400 shrink-0" />
          <span className="text-[10.5px] font-bold">11:28 PM last successful sync</span>
        </div>
      </div>
    </div>
  </section>
);

export const TaskWidget = () => (
  <section className="side-panel task-panel bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm mt-2.5">
    <div className="mb-2.5">
      <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">Manager Queue</span>
      <h2 className="text-sm font-black text-slate-900 mt-0.5">Priority actions</h2>
    </div>
    <div className="space-y-2">
      {[
        "Call 8 annual members for renewals",
        "Verify 5 uploaded ID proofs",
        "Assign trainer for 3 PT trials"
      ].map((task, i) => (
        <label key={i} className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all cursor-pointer group">
          <input type="checkbox" className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500" />
          <span className="text-[10.5px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors leading-tight">{task}</span>
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
  rootElement.className = "space-y-2.5";
  container.replaceChildren(rootElement);

  createRoot(rootElement).render(
    <>
      <AttendanceWidget />
      <SyncWidget />
      <TaskWidget />
    </>
  );
};
