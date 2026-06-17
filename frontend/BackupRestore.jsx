import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, 
  Shield, 
  RotateCcw, 
  Search, 
  Plus, 
  Download, 
  History, 
  Activity, 
  ChevronRight, 
  HardDrive, 
  Cloud, 
  CloudLightning,
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal, 
  LayoutGrid, 
  List, 
  Timer, 
  Lock, 
  Key, 
  Eye, 
  Trash2, 
  Copy, 
  ArrowRight, 
  Cpu, 
  Globe, 
  Smartphone,
  BarChart3,
  Zap,
  RefreshCw,
  FileText,
  Info,
  Server,
  Archive
} from "lucide-react";

/**
 * GYMDECK • BACKUP & RESTORE INFRASTRUCTURE
 * Enterprise Production-Grade Data Protection & Recovery System
 */

const BackupRestore = () => {
  const [activeView, setActiveView] = useState("Timeline"); // Timeline, Grid, Table
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showRestoreWizard, setShowRestoreWizard] = useState(false);
  const [restoreStep, setRestoreStep] = useState(1);

  // --- MOCK BACKUP DATA ---
  const backups = [
    {
      id: "BK-2026-0522-A",
      name: "Standard Nightly Snapshot",
      type: "Full System",
      size: "128.4 MB",
      location: "Cloud (AWS S3)",
      timestamp: "Today, 02:00 AM",
      status: "Successful",
      encryption: "AES-256",
      integrity: "Verified",
      retention: "30 Days",
      icon: Cloud
    },
    {
      id: "BK-2026-0521-M",
      name: "Pre-Update Manual Backup",
      type: "Database Only",
      size: "42.1 MB",
      location: "Local Storage",
      timestamp: "Yesterday, 11:45 PM",
      status: "Successful",
      encryption: "AES-256",
      integrity: "Verified",
      retention: "90 Days",
      icon: HardDrive
    },
    {
      id: "BK-2026-0521-A",
      name: "Media & Document Archive",
      type: "Media Backup",
      size: "1.2 GB",
      location: "Cloud (AWS S3)",
      timestamp: "21 May 2026, 02:00 AM",
      status: "Warning",
      encryption: "AES-256",
      integrity: "Partial",
      retention: "365 Days",
      icon: Archive
    },
    {
      id: "BK-2026-0520-F",
      name: "Emergency Recovery Point",
      type: "Full System",
      size: "126.8 MB",
      location: "Remote Server",
      timestamp: "20 May 2026, 04:30 PM",
      status: "Failed",
      encryption: "AES-256",
      integrity: "Corrupted",
      retention: "Expiring",
      icon: Server
    }
  ];

  const categories = [
    "All", "Full System", "Database Only", "Media Backup", "Member Records", "Billing Data"
  ];

  const handleCreateBackup = () => {
    setIsCreatingBackup(true);
    setTimeout(() => setIsCreatingBackup(false), 3000);
  };

  return (
    <div className="backup-restore-workspace bg-[#F8FAFC] min-h-full font-['Plus_Jakarta_Sans'] text-[#111827] pb-24 relative">
      
      {/* RESTORE WIZARD OVERLAY */}
      <AnimatePresence>
        {showRestoreWizard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#111827]/80 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-[#F3F4F6] flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">System Restore Wizard</h2>
                  <p className="text-xs text-[#6B7280] font-bold uppercase tracking-widest mt-1">Infrastructure Recovery Workflow</p>
                </div>
                <button 
                  onClick={() => setShowRestoreWizard(false)}
                  className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#111827] hover:bg-[#E5E7EB] transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-10">
                <div className="flex items-center justify-between mb-12">
                  {[1, 2, 3, 4].map(step => (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black
                        ${restoreStep >= step ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>
                        {step}
                      </div>
                      {step < 4 && <div className={`w-12 h-0.5 ${restoreStep > step ? 'bg-[#111827]' : 'bg-[#F3F4F6]'}`} />}
                    </div>
                  ))}
                </div>

                {restoreStep === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-black tracking-tight">Select Backup Snapshot</h3>
                    <div className="space-y-3">
                      {backups.slice(0, 2).map(b => (
                        <button key={b.id} className="w-full p-6 rounded-2xl border-2 border-[#F3F4F6] hover:border-[#111827] text-left transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] flex items-center justify-center text-[#111827]">
                              <Database size={20} />
                            </div>
                            <div>
                              <div className="text-sm font-black">{b.name}</div>
                              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase">{b.id} • {b.timestamp}</div>
                            </div>
                          </div>
                          <CheckCircle2 size={20} className="text-[#10B981] opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {restoreStep === 2 && (
                  <div className="space-y-6">
                    <div className="p-8 rounded-3xl bg-[#FFF5F5] border border-[#FEE2E2]">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="text-[#EF4444]" size={24} />
                        <h4 className="text-lg font-black text-[#B91C1C]">Restoration Warning</h4>
                      </div>
                      <p className="text-sm font-medium text-[#B91C1C]/70 leading-relaxed">
                        Restoring this snapshot will overwrite all current operational data. This action is irreversible once initialized.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-12 flex justify-between">
                  <button 
                    disabled={restoreStep === 1}
                    onClick={() => setRestoreStep(s => s - 1)}
                    className="h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#6B7280] hover:bg-[#F3F4F6] transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => restoreStep < 2 ? setRestoreStep(s => s + 1) : setShowRestoreWizard(false)}
                    className="h-12 px-10 rounded-2xl bg-[#111827] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#6366F1] transition-all shadow-xl shadow-indigo-500/20"
                  >
                    {restoreStep === 2 ? 'Initialize Restore' : 'Continue'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 5. TOP UTILITY HEADER */}
      <header className="sticky top-0 z-[100] h-16 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            <span>Settings</span>
            <ChevronRight size={14} className="mx-2" />
            <span className="text-[#111827]">Backup & Restore</span>
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input 
              type="text" 
              placeholder="Search backups, restore points, logs, snapshots..."
              className="w-full h-10 pl-10 pr-4 bg-[#F3F4F6] border-none rounded-full text-sm focus:ring-2 focus:ring-[#111827] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-bold flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors text-[#4B5563]">
            <History size={18} />
            Backup Logs
          </button>
          <button className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-bold flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors text-[#4B5563]">
            <Activity size={18} />
            Diagnostics
          </button>
          <button 
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="h-10 px-6 rounded-lg bg-[#111827] text-white text-sm font-bold transition-all shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-[#1F2937]"
          >
            {isCreatingBackup ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
            {isCreatingBackup ? "Creating..." : "Create Backup"}
          </button>
        </div>
      </header>

      {/* 6. BACKUP HEALTH HERO SECTION */}
      <section className="relative h-[280px] w-full overflow-hidden bg-[#111827]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#4F46E5_0%,transparent_50%)]" />
          <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto h-full px-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white">
                Disaster Recovery Center
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full text-[10px] font-bold text-[#10B981]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                Protected
              </div>
            </div>
            <h1 className="text-[44px] font-black text-white leading-tight tracking-tight mb-4">
              Operational Data <br />
              <span className="text-white/40">Protection Center</span>
            </h1>
            <p className="text-white/50 text-sm max-w-xl font-medium leading-relaxed">
              Protect, restore, and manage critical operational data, cloud synchronization, database snapshots, and recovery workflows across your entire GymDeck ecosystem.
            </p>
          </div>

          <div className="flex gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-w-[200px]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-[10px] font-black text-[#10B981] uppercase tracking-widest">Secure</div>
              </div>
              <div className="text-2xl font-black text-white">A+</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Recovery Readiness</div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-w-[200px]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <CloudLightning size={20} />
                </div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active Sync</div>
              </div>
              <div className="text-2xl font-black text-white">128.4MB</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Last Backup Size</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BACKUP CONTROL BAR */}
      <div className="max-w-[1600px] mx-auto px-8 -mt-9 relative z-20">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2 shadow-sm flex items-center justify-between min-h-[72px]">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-2">
            {["Timeline", "Grid", "Table"].map(view => (
              <button 
                key={view}
                onClick={() => setActiveView(view)}
                className={`h-11 px-6 rounded-xl text-xs font-bold transition-all flex items-center gap-2
                  ${activeView === view ? 'bg-[#111827] text-white shadow-lg' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
              >
                {view === "Timeline" && <Timer size={16} />}
                {view === "Grid" && <LayoutGrid size={16} />}
                {view === "Table" && <List size={16} />}
                {view}
              </button>
            ))}
            <div className="w-px h-6 bg-[#E5E7EB] mx-3" />
            {["Success", "Failed", "Cloud", "Manual"].map(filter => (
              <button key={filter} className="h-9 px-4 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[10px] font-black uppercase tracking-widest text-[#4B5563] hover:bg-white hover:border-[#111827] transition-all">
                {filter}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4 pr-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F6] rounded-xl border border-[#E5E7EB]">
              <Cloud size={16} className="text-[#6366F1]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#111827]">Cloud Sync: Enabled</span>
            </div>
            <button className="h-11 w-11 flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] rounded-xl transition-colors border border-[#E5E7EB]">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-8 pt-10 grid grid-cols-12 gap-8 items-start">
        
        {/* 9. LEFT PANEL → CATEGORIES & FILTERS */}
        <aside className="col-span-2 sticky top-24 space-y-8">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-4 ml-2">Backup Categories</h3>
            <div className="space-y-1">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all group flex items-center justify-between
                    ${activeCategory === cat ? 'bg-[#111827] text-white shadow-sm' : 'text-[#4B5563] hover:bg-white hover:text-[#111827] hover:shadow-sm'}`}
                >
                  {cat}
                  {activeCategory === cat && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-4 ml-2">Status Filter</h3>
            <div className="space-y-2">
              {[
                { label: 'Successful', color: 'bg-[#10B981]' },
                { label: 'Failed', color: 'bg-[#EF4444]' },
                { label: 'Warning', color: 'bg-[#F59E0B]' },
                { label: 'In Progress', color: 'bg-[#3B82F6]' }
              ].map(status => (
                <button key={status.label} className="w-full flex items-center justify-between px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl hover:shadow-sm transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                    <span className="text-xs font-bold text-[#4B5563] group-hover:text-[#111827]">{status.label}</span>
                  </div>
                  <span className="text-[10px] font-black text-[#9CA3AF]">12</span>
                </button>
              ))}
            </div>
          </section>

          <div className="p-6 rounded-2xl bg-[#6366F1] text-white relative overflow-hidden">
            <div className="relative z-10">
              <Timer className="mb-4" size={28} />
              <h4 className="text-sm font-black mb-2">Auto-Schedule</h4>
              <p className="text-[11px] font-semibold opacity-80 leading-relaxed mb-4">
                Your next automated backup is scheduled for 02:00 AM tonight.
              </p>
              <button className="text-[10px] font-black uppercase tracking-widest underline underline-offset-4">
                View Schedule
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          </div>
        </aside>

        {/* 10. CENTER WORKSPACE → BACKUP MANAGER */}
        <main className="col-span-7 space-y-8">
          
          <AnimatePresence mode="wait">
            {activeView === "Timeline" && (
              <motion.div 
                key="timeline"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {backups.map((backup, index) => (
                  <div key={backup.id} className="relative pl-10 group">
                    {/* Timeline Line */}
                    {index !== backups.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-[#E5E7EB] group-last:hidden" />
                    )}
                    
                    {/* Timeline Dot */}
                    <div className={`absolute left-0 top-6 w-10 h-10 rounded-full border-4 border-[#F8FAFC] flex items-center justify-center z-10
                      ${backup.status === 'Successful' ? 'bg-[#10B981] text-white' : 
                        backup.status === 'Failed' ? 'bg-[#EF4444] text-white' : 'bg-[#F59E0B] text-white'}`}>
                      {backup.status === 'Successful' ? <CheckCircle2 size={18} /> : 
                        backup.status === 'Failed' ? <XCircle size={18} /> : <AlertTriangle size={18} />}
                    </div>

                    {/* Backup Card */}
                    <div className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 group">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl ${backup.status === 'Successful' ? 'bg-[#ECFDF5] text-[#10B981]' : 
                            backup.status === 'Failed' ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#FFFBEB] text-[#F59E0B]'} flex items-center justify-center`}>
                            <backup.icon size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-black tracking-tight">{backup.name}</h3>
                              <span className="px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] rounded text-[9px] font-black uppercase tracking-widest">{backup.id}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">{backup.type}</span>
                              <div className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
                              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">{backup.timestamp}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-full">
                            <Lock size={12} className="text-[#10B981]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#111827]">{backup.encryption}</span>
                          </div>
                          <button className="h-10 w-10 flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] rounded-xl transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-6 py-6 border-y border-[#F3F4F6]">
                        <div>
                          <div className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Storage Location</div>
                          <div className="text-xs font-bold text-[#111827]">{backup.location}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Backup Size</div>
                          <div className="text-xs font-bold text-[#111827]">{backup.size}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Integrity Status</div>
                          <div className={`text-xs font-bold ${backup.integrity === 'Verified' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{backup.integrity}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Retention Expiry</div>
                          <div className="text-xs font-bold text-[#111827]">{backup.retention}</div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setShowRestoreWizard(true); setRestoreStep(1); }}
                            className="h-10 px-6 rounded-xl bg-[#111827] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#6366F1] transition-all flex items-center gap-2"
                          >
                            <RotateCcw size={14} />
                            Restore Now
                          </button>
                          <button className="h-10 px-6 rounded-xl border border-[#E5E7EB] text-[#111827] text-[10px] font-black uppercase tracking-widest hover:bg-[#F9FAFB] transition-all flex items-center gap-2">
                            <Download size={14} />
                            Download
                          </button>
                        </div>
                        <button className="text-[10px] font-black text-[#EF4444] uppercase tracking-widest hover:underline transition-all">
                          Delete Snapshot
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeView === "Grid" && (
              <motion.div 
                key="grid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-2 gap-6"
              >
                {backups.map(backup => (
                  <div key={backup.id} className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-12 h-12 rounded-2xl ${backup.status === 'Successful' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'} flex items-center justify-center`}>
                        <backup.icon size={24} />
                      </div>
                      <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest 
                        ${backup.status === 'Successful' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                        {backup.status}
                      </div>
                    </div>
                    <h3 className="text-lg font-black tracking-tight mb-1">{backup.name}</h3>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-6">{backup.timestamp}</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-[#9CA3AF] uppercase">Size</span>
                        <span className="text-[10px] font-bold text-[#111827]">{backup.size}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-[#9CA3AF] uppercase">Encrypted</span>
                        <CheckCircle2 size={12} className="text-[#10B981]" />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setShowRestoreWizard(true); setRestoreStep(1); }}
                        className="flex-1 h-10 rounded-xl bg-[#111827] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#6366F1] transition-all"
                      >
                        Restore
                      </button>
                      <button className="h-10 w-10 flex items-center justify-center border border-[#E5E7EB] rounded-xl text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeView === "Table" && (
              <motion.div 
                key="table"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Backup Name</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Size</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Encryption</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map(backup => (
                      <tr key={backup.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors group">
                        <td className="px-6 py-5">
                          <div className="text-sm font-black text-[#111827]">{backup.name}</div>
                          <div className="text-[10px] font-bold text-[#9CA3AF] uppercase">{backup.timestamp}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[10px] font-bold text-[#4B5563] uppercase tracking-widest">{backup.type}</span>
                        </td>
                        <td className="px-6 py-5 text-sm font-bold text-[#111827]">{backup.size}</td>
                        <td className="px-6 py-5">
                          <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest inline-block
                            ${backup.status === 'Successful' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                            {backup.status}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1.5 text-[#10B981]">
                            <Lock size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{backup.encryption}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 rounded-lg bg-[#F3F4F6] text-[#111827] hover:bg-[#111827] hover:text-white transition-all">
                              <RotateCcw size={14} />
                            </button>
                            <button className="p-2 rounded-lg bg-[#F3F4F6] text-[#111827] hover:bg-[#111827] hover:text-white transition-all">
                              <Download size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 p-10 rounded-[40px] bg-[#111827] text-white overflow-hidden relative group">
            <div className="relative z-10 grid grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck size={20} className="text-[#6366F1]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6366F1]">System Restoration Hub</span>
                </div>
                <h3 className="text-3xl font-black mb-4">Granular Recovery Engine</h3>
                <p className="text-sm font-medium text-white/50 leading-relaxed mb-8">
                  Need to restore specific data? Our granular engine allows you to recover individual member profiles, billing records, or trainer schedules without rolling back the entire database.
                </p>
                <button 
                  onClick={() => { setShowRestoreWizard(true); setRestoreStep(1); }}
                  className="h-12 px-8 rounded-2xl bg-white text-[#111827] text-[10px] font-black uppercase tracking-widest hover:bg-[#6366F1] hover:text-white transition-all flex items-center gap-2"
                >
                  Launch Restore Wizard
                  <ArrowRight size={14} />
                </button>
              </div>
              <div className="relative">
                <div className="w-full aspect-square rounded-[32px] bg-white/5 border border-white/10 p-8 flex flex-col justify-center gap-6">
                  {[
                    { label: 'Database Integrity', status: '100% Secure', color: 'text-[#10B981]' },
                    { label: 'Recovery Simulation', status: 'Last: 2 hrs ago', color: 'text-white' },
                    { label: 'Vulnerability Scan', status: '0 Threats', color: 'text-[#10B981]' }
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between pb-4 border-b border-white/10 last:border-0 last:pb-0">
                      <span className="text-xs font-bold text-white/40">{stat.label}</span>
                      <span className={`text-xs font-black ${stat.color}`}>{stat.status}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-[#6366F1]/20 rounded-full blur-3xl animate-pulse" />
              </div>
            </div>
            <div className="absolute -left-20 -top-20 w-64 h-64 bg-[#6366F1]/10 rounded-full blur-3xl" />
          </div>
        </main>

        {/* 15. RIGHT PANEL → AI & SYSTEM INTELLIGENCE */}
        <aside className="col-span-3 sticky top-24 space-y-8">
          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">Infrastructure AI</h3>
              <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#6366F1]">
                <Cpu size={16} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#F3F4F6]">
                <div className="flex gap-3 mb-2">
                  <BarChart3 size={16} className="text-[#10B981]" />
                  <p className="text-[11px] font-black text-[#111827]">Safety Score</p>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-black text-[#111827]">96</span>
                  <span className="text-xs font-bold text-[#10B981] mb-1">/ 100</span>
                </div>
                <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed">
                  Your disaster readiness score is tracking well above enterprise standards.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[#111827] text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-[#6366F1]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">AI Risk Assessment</span>
                </div>
                <p className="text-[11px] font-bold leading-relaxed text-white/80">
                  "Manual backup frequency has decreased. We recommend a full system snapshot before your next scheduled maintenance."
                </p>
                <button className="mt-4 text-[9px] font-black uppercase tracking-widest text-[#6366F1] hover:text-white transition-all underline underline-offset-4">Create Snapshot Now</button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF] mb-6">Storage Utilization</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6B7280]">Google Cloud Sync</span>
                  <span className="text-[11px] font-black">74%</span>
                </div>
                <div className="h-2 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#6366F1] rounded-full" style={{ width: '74%' }} />
                </div>
                <div className="text-[9px] font-bold text-[#9CA3AF] text-right uppercase tracking-widest">3.7GB / 5.0GB Used</div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6B7280]">Local Storage</span>
                  <span className="text-[11px] font-black">12%</span>
                </div>
                <div className="h-2 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#111827] rounded-full" style={{ width: '12%' }} />
                </div>
                <div className="text-[9px] font-bold text-[#9CA3AF] text-right uppercase tracking-widest">6.2GB / 50GB Free</div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF] mb-6">Backup Retention Policy</h3>
            <div className="space-y-4">
              {[
                { label: 'Daily Backups', retention: '14 Days' },
                { label: 'Weekly Backups', retention: '90 Days' },
                { label: 'Monthly Archives', retention: 'Forever' }
              ].map(policy => (
                <div key={policy.label} className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0">
                  <span className="text-xs font-bold text-[#4B5563]">{policy.label}</span>
                  <span className="text-[10px] font-black text-[#111827] uppercase tracking-widest">{policy.retention}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 h-10 rounded-xl bg-[#F3F4F6] text-[10px] font-black uppercase tracking-widest hover:bg-[#111827] hover:text-white transition-all">
              Edit Retention
            </button>
          </section>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white relative overflow-hidden shadow-xl shadow-emerald-500/20">
            <div className="relative z-10 text-center">
              <ShieldCheck className="mx-auto mb-4" size={40} />
              <h4 className="text-lg font-black mb-2 uppercase tracking-tight">System Fully Protected</h4>
              <p className="text-[11px] font-semibold opacity-80 leading-relaxed mb-6">
                Your data is encrypted, verified, and synchronized across 3 distributed nodes.
              </p>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-white/20 rounded-full inline-block">
                Last integrity Check: Pass
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 20. BOTTOM INFRASTRUCTURE ANALYTICS SECTION */}
      <section className="max-w-[1600px] mx-auto px-8 mt-12 mb-24 grid grid-cols-3 gap-8">
        <div className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">Infrastructure Recovery Trend</h3>
            <div className="flex gap-2">
              <button className="h-8 px-4 rounded-lg bg-[#F3F4F6] text-[9px] font-black uppercase tracking-widest text-[#111827]">Storage</button>
              <button className="h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#9CA3AF]">Success Rate</button>
            </div>
          </div>
          <div className="h-[240px] w-full flex items-end gap-3 px-4">
            {[45, 67, 43, 89, 56, 78, 92, 65, 84, 55, 76, 95].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="w-full bg-[#F3F4F6] rounded-t-xl relative overflow-hidden group-hover:bg-[#111827] transition-all" style={{ height: `${h}%` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#6366F1]/20 to-transparent opacity-0 group-hover:opacity-100" />
                </div>
                <span className="text-[9px] font-black text-[#9CA3AF] uppercase">M{i+1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#E5E7EB] p-10 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF] mb-8">Backup Health distribution</h3>
          <div className="relative h-[240px] w-full flex items-center justify-center">
            {/* Mock Circular Graph */}
            <div className="w-48 h-48 rounded-full border-[16px] border-[#F3F4F6] relative">
              <div className="absolute inset-[-16px] rounded-full border-[16px] border-[#10B981] border-r-transparent border-b-transparent rotate-45" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-[#111827]">92%</span>
                <span className="text-[9px] font-black text-[#9CA3AF] uppercase">Healthy</span>
              </div>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-xs font-bold text-[#4B5563]">Successful</span>
              </div>
              <span className="text-xs font-black text-[#111827]">842</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-xs font-bold text-[#4B5563]">Failed</span>
              </div>
              <span className="text-xs font-black text-[#111827]">12</span>
            </div>
          </div>
        </div>
      </section>

      {/* 18. BOTTOM RECENT ACTIVITY LOGS */}
      <section className="max-w-[1600px] mx-auto px-8">
        <div className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">Infrastructure Activity Log</h3>
            <button className="text-[10px] font-black text-[#6366F1] uppercase tracking-widest hover:underline">Download Audit Report</button>
          </div>
          <div className="space-y-4">
            {[
              { log: 'Full System Backup (BK-2026-0522-A) created successfully', time: 'Today, 02:00 AM', status: 'Success' },
              { log: 'Integrity scan completed for 12,482 records', time: 'Today, 01:45 AM', status: 'Success' },
              { log: 'Manual Restore Wizard launched by Admin', time: 'Yesterday, 11:42 PM', status: 'Neutral' },
              { log: 'Cloud Sync failed: Network Timeout (Retrying...)', time: 'Yesterday, 11:30 PM', status: 'Warning' }
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-[#F9FAFB] transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${activity.status === 'Success' ? 'bg-[#10B981]' : activity.status === 'Warning' ? 'bg-[#F59E0B]' : 'bg-[#D1D5DB]'}`} />
                  <span className="text-sm font-bold text-[#111827]">{activity.log}</span>
                </div>
                <span className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNT UTILITY
// ─────────────────────────────────────────
export function mountBackupRestore(container) {
  const root = createRoot(container);
  root.render(<BackupRestore />);
}

export default BackupRestore;
