import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  QrCode, 
  Smartphone, 
  Wifi, 
  RefreshCw, 
  ShieldCheck, 
  Activity, 
  ChevronRight, 
  Search, 
  Plus, 
  Zap, 
  Fingerprint, 
  Cpu, 
  Globe, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  MoreHorizontal, 
  Clock, 
  Lock,
  Server, 
  Laptop, 
  Link2, 
  Terminal,
  Signal,
  History,
  Settings,
  HelpCircle,
  ArrowRight
} from "lucide-react";

/**
 * GYMDECK • DEVICE SYNC (QR) & BIOMETRIC INFRASTRUCTURE
 * Enterprise Production-Grade Local & Cloud Synchronization System
 */

const DeviceSync = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("Connected Devices");

  // --- MOCK DEVICE DATA ---
  const devices = [
    {
      id: "DEV-QR-842",
      name: "Front Desk Entry Scanner",
      type: "QR Scanner",
      status: "Online",
      lastSync: "2 mins ago",
      latency: "12ms",
      version: "v2.4.1",
      icon: QrCode,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      id: "DEV-BIO-102",
      name: "Main Floor Biometric",
      type: "Fingerprint",
      status: "Online",
      lastSync: "Just now",
      latency: "8ms",
      version: "v3.0.2",
      icon: Fingerprint,
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    },
    {
      id: "DEV-MOB-55",
      name: "Admin Mobile App",
      type: "Mobile Node",
      status: "Offline",
      lastSync: "1 hour ago",
      latency: "---",
      version: "v1.2.4",
      icon: Smartphone,
      color: "text-amber-500",
      bg: "bg-amber-50"
    }
  ];

  const handleSyncAll = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2500);
  };

  return (
    <div className="device-sync-workspace bg-[#F8FAFC] min-h-full font-['Plus_Jakarta_Sans'] text-[#111827] pb-24">
      
      {/* 5. TOP UTILITY HEADER */}
      <header className="sticky top-0 z-[100] h-16 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <nav className="flex items-center text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            <span>Settings</span>
            <ChevronRight size={14} className="mx-2" />
            <span className="text-[#111827]">Device Sync (QR)</span>
          </nav>
        </div>

        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input 
              type="text" 
              placeholder="Search devices, sync logs, terminal nodes..."
              className="w-full h-10 pl-10 pr-4 bg-[#F3F4F6] border-none rounded-full text-sm focus:ring-2 focus:ring-[#111827] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-bold flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors text-[#4B5563]">
            <Terminal size={18} />
            Console
          </button>
          <button className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-sm font-bold flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors text-[#4B5563]">
            <History size={18} />
            Sync Logs
          </button>
          <button 
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="h-10 px-6 rounded-lg bg-[#111827] text-white text-sm font-bold transition-all shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-[#1F2937]"
          >
            {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {isSyncing ? "Syncing Nodes..." : "Sync All Devices"}
          </button>
        </div>
      </header>

      {/* 6. SYSTEM STATUS HERO SECTION */}
      <section className="relative h-[280px] w-full overflow-hidden bg-[#111827]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#6366F1_0%,transparent_50%)]" />
          <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')]" />
        </div>
        
        <div className="relative z-10 max-w-[1600px] mx-auto h-full px-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white">
                Network Infrastructure
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full text-[10px] font-bold text-[#10B981]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                Network Stable
              </div>
            </div>
            <h1 className="text-[44px] font-black text-white leading-tight tracking-tight mb-4">
              Local Device <br />
              <span className="text-white/40">Synchronization Hub</span>
            </h1>
            <p className="text-white/50 text-sm max-w-xl font-medium leading-relaxed">
              Manage your biometric scanners, QR attendance terminals, and mobile nodes. Monitor real-time synchronization health and local network stability.
            </p>
          </div>

          <div className="flex gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-w-[200px]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Signal size={20} />
                </div>
                <div className="text-[10px] font-black text-[#10B981] uppercase tracking-widest">Active</div>
              </div>
              <div className="text-2xl font-black text-white">12</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Registered Nodes</div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 min-w-[200px]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Wifi size={20} />
                </div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">Latency</div>
              </div>
              <div className="text-2xl font-black text-white">08ms</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">Average Response</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. NAVIGATION TABS */}
      <div className="max-w-[1600px] mx-auto px-8 -mt-7 relative z-20">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2 shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
          {["Connected Devices", "Sync History", "Network Settings", "Biometric Config"].map(tab => (
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
        
        {/* 9. LEFT PANEL → QUICK STATS */}
        <aside className="col-span-2 sticky top-24 space-y-8">
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-4 ml-2">Node Status</h3>
            <div className="space-y-2">
              {[
                { label: 'Online Nodes', count: 8, color: 'bg-[#10B981]' },
                { label: 'Offline Nodes', count: 2, color: 'bg-[#EF4444]' },
                { label: 'Pending Sync', count: 4, color: 'bg-[#F59E0B]' }
              ].map(status => (
                <div key={status.label} className="flex items-center justify-between px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                    <span className="text-xs font-bold text-[#4B5563]">{status.label}</span>
                  </div>
                  <span className="text-[10px] font-black text-[#111827]">{status.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] mb-4 ml-2">Active Protocols</h3>
            <div className="space-y-1">
              {['WebSocket (WSS)', 'REST API (Poll)', 'MQTT Broker'].map(protocol => (
                <div key={protocol} className="px-3 py-2 text-[11px] font-bold text-[#6B7280] flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
                  {protocol}
                </div>
              ))}
            </div>
          </section>

          <div className="p-6 rounded-2xl bg-[#111827] text-white relative overflow-hidden">
            <div className="relative z-10">
              <Zap className="mb-4 text-[#6366F1]" size={28} />
              <h4 className="text-sm font-black mb-2">Real-time Bridge</h4>
              <p className="text-[10px] font-semibold opacity-60 leading-relaxed mb-4">
                Local biometric data is synced every 200ms to the cloud clusters.
              </p>
              <button className="h-9 w-full rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-widest transition-all">
                Test Connection
              </button>
            </div>
          </div>
        </aside>

        {/* 10. CENTER WORKSPACE → DEVICE MANAGER */}
        <main className="col-span-7 space-y-8">
          
          <AnimatePresence mode="wait">
            {activeTab === "Connected Devices" && (
              <motion.div 
                key="devices"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-4">
                  {devices.map(device => (
                    <div key={device.id} className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm transition-all hover:shadow-md group">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl ${device.bg} ${device.color} flex items-center justify-center`}>
                            <device.icon size={28} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-black tracking-tight">{device.name}</h3>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest
                                ${device.status === 'Online' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                                {device.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">{device.type}</span>
                              <div className="w-1 h-1 rounded-full bg-[#D1D5DB]" />
                              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">ID: {device.id}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right mr-4">
                            <div className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest mb-0.5">Firmware</div>
                            <div className="text-xs font-bold text-[#111827]">{device.version}</div>
                          </div>
                          <button className="h-11 w-11 flex items-center justify-center text-[#6B7280] hover:bg-[#F3F4F6] rounded-xl transition-colors">
                            <MoreHorizontal size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-8 py-6 border-y border-[#F3F4F6]">
                        <div>
                          <div className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Signal Strength</div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`w-1 h-3 rounded-full ${i <= (device.status === 'Online' ? 4 : 0) ? 'bg-[#10B981]' : 'bg-[#E5E7EB]'}`} />
                              ))}
                            </div>
                            <span className="text-xs font-bold text-[#111827]">{device.status === 'Online' ? '92%' : '0%'}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Last Data Sync</div>
                          <div className="text-xs font-bold text-[#111827]">{device.lastSync}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Network Latency</div>
                          <div className={`text-xs font-bold ${device.latency.includes('ms') ? 'text-[#10B981]' : 'text-[#9CA3AF]'}`}>{device.latency}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest mb-1">Encryption</div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                            <Lock size={12} className="text-[#10B981]" />
                            WPA3-PRO
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex gap-2">
                          <button className="h-10 px-6 rounded-xl bg-[#111827] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#6366F1] transition-all flex items-center gap-2">
                            <RefreshCw size={14} />
                            Re-Authenticate
                          </button>
                          <button className="h-10 px-6 rounded-xl border border-[#E5E7EB] text-[#111827] text-[10px] font-black uppercase tracking-widest hover:bg-[#F9FAFB] transition-all flex items-center gap-2">
                            <Settings size={14} />
                            Manage Node
                          </button>
                        </div>
                        <button className="text-[10px] font-black text-[#EF4444] uppercase tracking-widest hover:underline transition-all">
                          Decommission Device
                        </button>
                      </div>
                    </div>
                  ))}

                  <button className="w-full h-24 rounded-3xl border-2 border-dashed border-[#E5E7EB] flex flex-col items-center justify-center gap-1 hover:border-[#111827] hover:bg-white transition-all group">
                    <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] group-hover:bg-[#111827] group-hover:text-white transition-all">
                      <Plus size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] group-hover:text-[#111827]">Register New Device</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-10 p-10 rounded-[40px] bg-[#111827] text-white overflow-hidden relative group">
            <div className="relative z-10 grid grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <QrCode size={20} className="text-[#6366F1]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6366F1]">QR Attendance Engine</span>
                </div>
                <h3 className="text-3xl font-black mb-4">Master Sync Terminal</h3>
                <p className="text-sm font-medium text-white/50 leading-relaxed mb-8">
                  Connect your primary management terminal to the local area network. This bridge allows all scanners to communicate even during internet outages.
                </p>
                <div className="flex gap-4">
                  <button className="h-12 px-8 rounded-2xl bg-white text-[#111827] text-[10px] font-black uppercase tracking-widest hover:bg-[#6366F1] hover:text-white transition-all flex items-center gap-2">
                    Initialize Bridge
                    <Link2 size={14} />
                  </button>
                  <button className="h-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    View Network Topology
                  </button>
                </div>
              </div>
              <div className="relative flex justify-center">
                <div className="w-64 h-64 p-4 bg-white rounded-[40px] flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                  <QrCode size={180} className="text-[#111827]" />
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
              <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">Network AI</h3>
              <div className="w-8 h-8 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#6366F1]">
                <Activity size={16} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#F8FAF8] border border-[#F3F4F6]">
                <div className="flex gap-3 mb-2">
                  <BarChart3 size={16} className="text-[#10B981]" />
                  <p className="text-[11px] font-black text-[#111827]">Sync Reliability</p>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-black text-[#111827]">99.9</span>
                  <span className="text-xs font-bold text-[#10B981] mb-1">%</span>
                </div>
                <p className="text-[10px] font-bold text-[#6B7280] leading-relaxed">
                  Platform sync nodes are performing at enterprise SLA standards.
                </p>
              </div>

              <div className="p-5 rounded-3xl bg-[#111827] text-white">
                <div className="flex items-center gap-2 mb-4">
                  <Signal size={14} className="text-[#6366F1]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">AI Optimization</span>
                </div>
                <p className="text-[11px] font-bold leading-relaxed text-white/80">
                  "Node DEV-MOB-55 has high jitter. We recommend switching to the 5GHz frequency band for better stability."
                </p>
                <button className="mt-4 text-[9px] font-black uppercase tracking-widest text-[#6366F1] hover:text-white transition-all underline underline-offset-4">Apply Auto-Fix</button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF] mb-6">Traffic Analysis</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6B7280]">WebSocket Inbound</span>
                  <span className="text-[11px] font-black">1.2 KB/s</span>
                </div>
                <div className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#6366F1] rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6B7280]">Biometric Payload</span>
                  <span className="text-[11px] font-black">0.8 KB/s</span>
                </div>
                <div className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] rounded-full" style={{ width: '30%' }} />
                </div>
              </div>
            </div>
          </section>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
            <div className="relative z-10">
              <HelpCircle className="mb-4 opacity-60" size={28} />
              <h4 className="text-sm font-black mb-2 uppercase tracking-tight">Setup Assistance?</h4>
              <p className="text-[11px] font-semibold opacity-80 leading-relaxed mb-6">
                Need help connecting your ZKTeco or HID biometric devices?
              </p>
              <button className="h-10 px-6 rounded-xl bg-white text-[#111827] text-[10px] font-black uppercase tracking-widest hover:bg-[#111827] hover:text-white transition-all">
                Open Documentation
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          </div>
        </aside>
      </div>

      {/* 18. BOTTOM RECENT ACTIVITY LOGS */}
      <section className="max-w-[1600px] mx-auto px-8">
        <div className="bg-white rounded-3xl border border-[#E5E7EB] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">Live Terminal Traffic</h3>
            <button className="text-[10px] font-black text-[#6366F1] uppercase tracking-widest hover:underline">Clear History</button>
          </div>
          <div className="space-y-4">
            {[
              { log: 'WebSocket Connection established on node DEV-QR-842', time: 'Just Now', status: 'Success' },
              { log: 'Biometric verification payload received for User #4282', time: '42s ago', status: 'Success' },
              { log: 'Handshake timeout on node DEV-MOB-55 (Retrying...)', time: '1m ago', status: 'Warning' },
              { log: 'System Bridge heartbeat verified', time: '5m ago', status: 'Success' }
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-[#F9FAFB] transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${activity.status === 'Success' ? 'bg-[#10B981]' : activity.status === 'Warning' ? 'bg-[#F59E0B]' : 'bg-[#D1D5DB]'}`} />
                  <span className="text-[13px] font-mono font-bold text-[#111827]">{activity.log}</span>
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
export function mountDeviceSync(container) {
  const root = createRoot(container);
  root.render(<DeviceSync />);
}

export default DeviceSync;
