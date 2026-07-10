import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Search,
  Plus,
  Filter,
  MoreVertical,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle2,
  Lock,
  Key,
  Eye,
  Edit3,
  Trash2,
  Copy,
  UserPlus,
  UserCheck,
  X,
  FileText,
  Brain,
  Globe,
  Settings,
  History,
  Download,
  ArrowUpRight,
  Layers,
  Zap,
  Briefcase,
  Award,
  BookOpen,
  PieChart,
  Grid3X3,
  Network,
  Scale,
  MoreHorizontal,
  Bell,
  Check,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────

const KPIS = [
  { id: 1, label: "Total Roles", value: "12", trend: "+2", isUp: true, subtext: "4 system, 8 custom" },
  { id: 2, label: "Active Staff", value: "48", trend: "+5", isUp: true, subtext: "Across 4 branches" },
  { id: 3, label: "Restricted Permissions", value: "142", trend: "Secure", isUp: true, subtext: "Zero leaks detected" },
  { id: 4, label: "Branch Administrators", value: "6", trend: "Stable", isUp: true, subtext: "1 per main zone" },
  { id: 5, label: "Pending Role Requests", value: "3", trend: "-1", isUp: true, subtext: "Requires review" },
  { id: 6, label: "Security Alerts", value: "0", trend: "Clean", isUp: true, subtext: "Last 24 hours" },
  { id: 7, label: "Payroll Access Holders", value: "4", trend: "Restricted", isUp: true, subtext: "High-privilege users" },
  { id: 8, label: "Custom Roles Created", value: "8", trend: "+1", isUp: true, subtext: "Department specific" }
];

const ROLE_GROUPS = [
  { id: "admin", name: "Administration", count: 4, color: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "trainers", name: "Trainers", count: 18, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "finance", name: "Finance", count: 3, color: "text-amber-600", bg: "bg-amber-50" },
  { id: "frontdesk", name: "Front Desk", count: 12, color: "text-rose-600", bg: "bg-rose-50" },
  { id: "ops", name: "Operations", count: 6, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "hr", name: "HR", count: 2, color: "text-purple-600", bg: "bg-purple-50" }
];

const MOCK_ROLES = [
  { 
    id: "ROL-001", 
    name: "Super Admin", 
    dept: "Administration", 
    level: "Full Access", 
    staff: 2, 
    perms: 128, 
    scope: "All Branches", 
    modified: "2h ago", 
    status: "active" 
  },
  { 
    id: "ROL-002", 
    name: "Branch Manager", 
    dept: "Operations", 
    level: "Limited Access", 
    staff: 4, 
    perms: 84, 
    scope: "Branch Only", 
    modified: "Yesterday", 
    status: "active" 
  },
  { 
    id: "ROL-003", 
    name: "Senior Trainer", 
    dept: "Trainers", 
    level: "Limited Access", 
    staff: 8, 
    perms: 42, 
    scope: "Branch Only", 
    modified: "3 days ago", 
    status: "active" 
  },
  { 
    id: "ROL-004", 
    name: "Accountant", 
    dept: "Finance", 
    level: "Custom Access", 
    staff: 2, 
    perms: 36, 
    scope: "Regional", 
    modified: "1 week ago", 
    status: "active" 
  },
  { 
    id: "ROL-005", 
    name: "Receptionist", 
    dept: "Front Desk", 
    level: "Limited Access", 
    staff: 12, 
    perms: 24, 
    scope: "Branch Only", 
    modified: "4h ago", 
    status: "active" 
  }
];

const MODULES = [
  "Membership Management",
  "Payments & Billing",
  "Attendance Tracking",
  "Trainers & Staff",
  "Reports & Analytics",
  "Payroll & Commission",
  "System Settings"
];

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

const StatCard = ({ kpi }) => (
  <article className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${kpi.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {kpi.trend}
      </span>
    </div>
    <div className="flex items-baseline gap-2">
      <strong className="text-2xl font-black text-slate-900">{kpi.value}</strong>
    </div>
    <p className="text-[11px] font-medium text-slate-500 mt-1">{kpi.subtext}</p>
  </article>
);

const StaffRoles = () => {
  console.log("GymDeck: StaffRoles component is rendering...");
  const [viewMode, setViewMode] = useState("table"); // table | matrix
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleCreateRole = () => {
    console.log("GymDeck: Opening Create Role drawer");
    setSelectedRole(null);
    setIsDrawerOpen(true);
  };

  const handleEditRole = (role) => {
    console.log("GymDeck: Opening Edit Role drawer for:", role.name);
    setSelectedRole(role);
    setIsDrawerOpen(true);
  };

  return (
    <div className="staff-roles-shell font-sans text-slate-900 selection:bg-indigo-100">
      {/* 5. TOP UTILITY HEADER */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <span className="hover:text-slate-900 cursor-pointer">Trainers & Staff</span>
          <ChevronRight size={14} className="opacity-40" />
          <span className="text-slate-900 font-bold font-sans">Staff Roles</span>
        </div>

        <div className="flex-1 max-w-2xl px-12 relative">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search roles, permissions, staff hierarchy..."
              className="w-full h-11 pl-12 pr-4 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <History size={16} />
            Access Logs
          </button>
          <button 
            onClick={handleCreateRole}
            className="h-10 px-6 rounded-xl bg-slate-950 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
          >
            <Plus size={16} />
            Create Role
          </button>
        </div>
      </header>

      {/* 6. PAGE TITLE SECTION */}
      <div className="flex justify-between items-end mb-2 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Staff Roles</h1>
          <p className="text-slate-500 text-xs font-semibold mt-2 max-w-[720px]">
            Manage staff hierarchy, permissions, operational access, and organizational responsibilities across your fitness ecosystem.
          </p>
        </div>
        <div className="flex gap-2">
          {['Role Hierarchy', 'Access Policies', 'Audit Insights', 'Permission Templates'].map(pill => (
            <span key={pill} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* 7. KPI ANALYTICS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-2 relative z-10">
        {KPIS.map(kpi => <StatCard key={kpi.id} kpi={kpi} />)}
      </div>

      <div className="staff-roles-workspace">

        {/* 8. MAIN WORKSPACE */}
        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* 9. LEFT PANEL → ROLE GROUPS */}
          <aside className="col-span-2 space-y-6 sticky top-24">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Role Groups</h4>
              <div className="space-y-2">
                {ROLE_GROUPS.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900">{group.name}</span>
                    <span className={`text-[10px] font-black ${group.color} ${group.bg} px-1.5 py-0.5 rounded-md`}>{group.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Organization Tree</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span className="text-[11px] font-black text-slate-900 uppercase">Owner</span>
                </div>
                <div className="ml-4 space-y-4 border-l-2 border-slate-50 pl-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-600 uppercase">Branch Manager</span>
                  </div>
                  <div className="ml-4 space-y-4 border-l-2 border-slate-50 pl-4">
                    {['Trainers', 'Front Desk', 'Support'].map(child => (
                      <div key={child} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase">{child}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* 10. CENTER WORKSPACE → ROLE MANAGEMENT */}
          <section className="col-span-7 space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setViewMode("table")}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                      viewMode === "table" ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <List size={14} />
                    Table View
                  </button>
                  <button 
                    onClick={() => setViewMode("matrix")}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                      viewMode === "matrix" ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Grid3X3 size={14} />
                    Permission Matrix
                  </button>
                </div>
                <div className="h-6 w-px bg-slate-100 mx-2" />
                <span className="text-xs font-bold text-slate-500 italic">Showing all organizational roles</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="h-9 px-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors">
                  Filter Dept
                </button>
              </div>
            </div>

            {viewMode === "table" ? (
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role Name</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Department</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Staff</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Scope</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Last Modified</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {MOCK_ROLES.map(role => (
                      <tr key={role.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              role.level === 'Full Access' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <Shield size={16} fill={role.level === 'Full Access' ? 'currentColor' : 'none'} />
                            </div>
                            <span className="text-sm font-black text-slate-900 tracking-tight">{role.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{role.dept}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-xs font-black text-slate-700 bg-slate-50 px-2 py-1 rounded-lg">{role.staff}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                            <Globe size={12} className="text-slate-400" />
                            {role.scope}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[11px] font-medium text-slate-400">{role.modified}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditRole(role)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit3 size={16} /></button>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Copy size={16} /></button>
                            <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 sticky left-0 bg-slate-50 z-10">Module</th>
                      {MOCK_ROLES.map(role => (
                        <th key={role.id} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center min-w-[120px]">
                          {role.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {MODULES.map(mod => (
                      <tr key={mod} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-5 sticky left-0 bg-white group-hover:bg-slate-50/30 z-10">
                          <span className="text-xs font-black text-slate-900 tracking-tight">{mod}</span>
                        </td>
                        {MOCK_ROLES.map(role => {
                          const hasAccess = role.level === 'Full Access' || (role.name === 'Branch Manager' && mod !== 'System Settings');
                          return (
                            <td key={role.id} className="px-6 py-5 text-center">
                              <div className="flex justify-center">
                                {hasAccess ? (
                                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Check size={14} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center">
                                    <X size={14} strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 13. RIGHT PANEL → SECURITY & AI INSIGHTS */}
          <aside className="col-span-3 space-y-6 sticky top-24">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck size={120} className="text-indigo-900" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                    <Brain size={16} fill="white" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Security Insights</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert size={14} className="text-amber-600" />
                      <strong className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">Elevated Access Alert</strong>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                      <span className="font-black">Branch Manager</span> role currently has financial approval permissions.
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div className="flex justify-between items-start mb-2">
                      <strong className="text-[10px] font-black text-indigo-900 uppercase tracking-tighter">AI Recommendation</strong>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                      Separate <span className="font-black">Payroll</span> and <span className="font-black">Billing</span> permissions for better audit trails.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Staff Status</h4>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Now
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Admins Online", value: "2", color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "Branch Managers", value: "4", color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Suspended Users", value: "0", color: "text-rose-600", bg: "bg-rose-50" }
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors">
                    <span className="text-[11px] font-bold text-slate-500">{stat.label}</span>
                    <strong className={`text-xs font-black ${stat.color} ${stat.bg} px-2 py-0.5 rounded-lg`}>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-700" />
              <div className="relative z-10">
                <h4 className="text-xs font-black uppercase tracking-widest mb-4">RBAC Integrity</h4>
                <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
                  Every permission change is cryptographically signed and logged in the enterprise audit vault.
                </p>
                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Audit Vault</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Verifying...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-indigo-400" />
                    <span className="text-xs font-black text-white">Advanced RBAC Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 12. CREATE ROLE MODAL / DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <React.Fragment key="staff-roles-drawer">
            <motion.div 
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.aside 
              key="aside"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[560px] bg-white z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedRole ? 'Edit Role' : 'Create New Role'}</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Define authority & scope</p>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Role Name</label>
                      <input 
                        type="text" 
                        defaultValue={selectedRole?.name}
                        placeholder="e.g. Branch Manager"
                        className="w-full h-12 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl px-4 text-xs font-bold transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Department</label>
                      <select className="w-full h-12 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 rounded-xl px-4 text-xs font-bold transition-all">
                        {ROLE_GROUPS.map(g => <option key={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Access Level</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Full Access', 'Limited', 'Read-Only'].map(level => (
                        <button key={level} className={`h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${level === 'Limited' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-500'}`}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 pb-2">Module Permissions</h4>
                  {MODULES.map(mod => (
                    <div key={mod} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-50">
                      <div>
                        <p className="text-xs font-black text-slate-900">{mod}</p>
                        <p className="text-[9px] font-medium text-slate-500 mt-0.5">Control access to {mod.toLowerCase()} module</p>
                      </div>
                      <div className="flex gap-2">
                         <div className="w-10 h-6 bg-indigo-600 rounded-full relative cursor-pointer shadow-inner">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                         </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex gap-3">
                  <ShieldAlert className="text-rose-500 shrink-0" size={18} />
                  <p className="text-[10px] font-bold text-rose-800 leading-relaxed italic">
                    Caution: Modifying system roles may affect operational continuity. Changes will be logged in the primary audit trail.
                  </p>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 h-12 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button className="flex-[2] h-12 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                  {selectedRole ? 'Update Role Authority' : 'Create Role Infrastructure'}
                </button>
              </div>
            </motion.aside>
          </React.Fragment>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNTING SYSTEM
// ─────────────────────────────────────────

export const mountStaffRoles = () => {
  console.log("GymDeck: Mounting StaffRoles component...");
  const container = document.querySelector('[data-stage="staff-roles"]');
  if (!container) {
    console.error("GymDeck: StaffRoles container not found!");
    return null;
  }
  
  try {
    const root = createRoot(container);
    root.render(<><StaffRoles /><BrandFooter /></>);
    console.log("GymDeck: StaffRoles rendered successfully.");
    return root;
  } catch (err) {
    console.error("GymDeck: Critical mount failure in StaffRoles:", err);
    return null;
  }
};

export default StaffRoles;
