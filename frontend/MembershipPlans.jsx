import React, { useState, useMemo, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertCircle,
  Zap,
  ChevronRight,
  MoreVertical,
  Plus,
  ArrowRight,
  Target,
  BarChart3,
  Calendar,
  Lock,
  Gift,
  RefreshCcw,
  CheckCircle2,
  X,
  Shield,
  ArrowUpRight,
  HelpCircle,
  Filter,
  Search,
  Download,
  LayoutGrid,
  List,
  Eye,
  Archive,
  Edit2,
  Copy,
  Clock,
  Briefcase,
  Activity,
  Award,
  CreditCard,
  ZapOff,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Settings
} from "lucide-react";

// Import Error Boundary at the top
import { ErrorBoundary } from "./ErrorHandlers.jsx";

/**
 * GYMDECK • MEMBERSHIP REVENUE & RETENTION CONTROL CENTER
 * Principal Product Design - Strategic Business Workflow
 */

// ─────────────────────────────────────────
// UTILS & FORMATTERS
// ─────────────────────────────────────────
const formatCompact = (val) => {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(val);
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

// ─────────────────────────────────────────
// STRATEGIC DATA SEED
// ─────────────────────────────────────────
const PORTFOLIO_STATS = {
  activeMembers: 1240,
  monthlyRevenue: 1450000,
  bestPlan: "Annual Elite Performance",
  highRetentionPlan: "Quarterly Transformation",
  attentionPlans: 2,
  expiring30Days: 48,
  forecastedRenewal: 680000
};

const RECOMMENDATIONS = [
  {
    id: 1,
    title: "Monthly Starter Churn Alert",
    description: "Renewals decreased by 14% this month. Churn risk detected for 12 members.",
    severity: "High",
    impact: "Potential ₹45k Revenue Loss",
    outcome: "Regain stability in entry-level segment",
    action: "Review Churn Data"
  },
  {
    id: 2,
    title: "Annual Upgrade Opportunity",
    description: "31 members on Quarterly plans are eligible for Annual Elite conversion.",
    severity: "Medium",
    impact: "₹3.2L Revenue Boost",
    outcome: "Increased Member LTV & Cashflow",
    action: "Launch Campaign"
  },
  {
    id: 3,
    title: "Pricing Strategy Optimization",
    description: "Premium Elite plan retention is at 96%. Current pricing is under market value.",
    severity: "Low",
    impact: "8% Margin Increase",
    outcome: "Higher yield per premium member",
    action: "Analyze Market"
  }
];

const MEMBERSHIP_PORTFOLIO = [
  {
    id: "PLN-A1",
    name: "Annual Elite Performance",
    category: "Transformation",
    activeMembers: 342,
    revenue: 8550000,
    monthlyContribution: 712500,
    renewalRate: 88,
    retention: 92,
    avgDuration: "14.2 Months",
    trend: "+12%",
    status: "Healthy",
    risk: "Low"
  },
  {
    id: "PLN-Q1",
    name: "Quarterly Transformation",
    category: "Bodybuilding",
    activeMembers: 156,
    revenue: 1092000,
    monthlyContribution: 364000,
    renewalRate: 74,
    retention: 78,
    avgDuration: "5.8 Months",
    trend: "+4%",
    status: "Healthy",
    risk: "Low"
  },
  {
    id: "PLN-M1",
    name: "Monthly Entry Starter",
    category: "General",
    activeMembers: 412,
    revenue: 1236000,
    monthlyContribution: 103000,
    renewalRate: 42,
    retention: 54,
    avgDuration: "3.1 Months",
    trend: "-14%",
    status: "At Risk",
    risk: "High"
  },
  {
    id: "PLN-S1",
    name: "Student Basic Flex",
    category: "Student",
    activeMembers: 218,
    revenue: 436000,
    monthlyContribution: 36333,
    renewalRate: 68,
    retention: 72,
    avgDuration: "4.5 Months",
    trend: "+2%",
    status: "Monitor",
    risk: "Medium"
  }
];

// ─────────────────────────────────────────
// COMMAND CENTER SECTION
// ─────────────────────────────────────────
const CommandCenter = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Users size={18} />
        </div>
        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">+4.2%</span>
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Memberships</p>
      <h3 className="text-xl font-black text-slate-950 mt-0.5">{PORTFOLIO_STATS.activeMembers}</h3>
      <p className="text-[9px] text-slate-400 mt-1.5">Across 8 active plans</p>
    </div>

    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <DollarSign size={18} />
        </div>
        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">₹1.2L New</span>
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Monthly Revenue</p>
      <h3 className="text-xl font-black text-slate-950 mt-0.5">{formatCompact(PORTFOLIO_STATS.monthlyRevenue)}</h3>
      <p className="text-[9px] text-slate-400 mt-1.5">Contribution: 92% Renewal</p>
    </div>

    <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Zap size={18} />
        </div>
        <div className="flex -space-x-1.5">
           {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200" />)}
        </div>
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Retention Leader</p>
      <h3 className="text-base font-black text-slate-950 mt-0.5 truncate">{PORTFOLIO_STATS.highRetentionPlan}</h3>
      <p className="text-[9px] text-amber-600 font-bold mt-1.5">94% Success Score</p>
    </div>

    <div className="bg-slate-950 text-white p-4 rounded-2xl shadow-xl shadow-slate-200 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-20">
        <TrendingUp size={48} />
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expiry Impact (30D)</p>
      <h3 className="text-xl font-black text-white mt-0.5">{PORTFOLIO_STATS.expiring30Days} Plans</h3>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 w-[65%]" />
        </div>
        <span className="text-[9px] font-black">{formatCompact(PORTFOLIO_STATS.forecastedRenewal)} Forecast</span>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────
// INTELLIGENCE CENTER SECTION
// ─────────────────────────────────────────
const IntelligenceCenter = () => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-indigo-600" />
        <h2 className="text-[11px] font-black text-slate-950 uppercase tracking-tight">Membership Intelligence</h2>
      </div>
      <button className="text-[9px] font-black text-indigo-600 uppercase hover:underline">View All Insights</button>
    </div>
    <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
      {RECOMMENDATIONS.map(rec => (
        <div key={rec.id} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-100 transition-all flex flex-col group">
          <div className="flex items-start justify-between mb-2.5">
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
              rec.severity === "High" ? "bg-rose-50 text-rose-600" : 
              rec.severity === "Medium" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
            )}>
              {rec.severity} Priority
            </span>
            <AlertCircle size={13} className="text-slate-300 group-hover:text-indigo-400" />
          </div>
          <h4 className="text-[11px] font-black text-slate-950 mb-1 leading-tight">{rec.title}</h4>
          <p className="text-[10px] text-slate-500 leading-relaxed flex-1">{rec.description}</p>
          
          <div className="mt-3.5 pt-3 border-t border-slate-50 space-y-1.5">
            <div className="flex justify-between text-[9px]">
              <span className="font-bold text-slate-400">Impact</span>
              <span className="font-black text-slate-900">{rec.impact}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span className="font-bold text-slate-400">Outcome</span>
              <span className="font-black text-slate-900">{rec.outcome}</span>
            </div>
          </div>
          
          <button className="mt-4 w-full h-8 rounded-lg bg-slate-50 text-slate-950 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1.5">
            {rec.action}
            <ChevronRight size={10} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────
// PORTFOLIO TABLE SECTION
// ─────────────────────────────────────────
const PortfolioTable = () => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full text-left border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200">
            <th className="p-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan & Category</th>
            <th className="p-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Members</th>
            <th className="p-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Impact</th>
            <th className="p-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Retention Score</th>
            <th className="p-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Health Status</th>
            <th className="p-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {MEMBERSHIP_PORTFOLIO.map(plan => (
            <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors group">
              <td className="p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[9px]",
                    plan.status === "Healthy" ? "bg-emerald-500" : 
                    plan.status === "At Risk" ? "bg-rose-500" : "bg-amber-500"
                  )}>
                    {plan.id && plan.id.includes('-') ? plan.id.split('-')[1] : 'PL'}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-black text-slate-950 truncate">{plan.name}</span>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">{plan.category}</span>
                  </div>
                </div>
              </td>
              <td className="p-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-slate-900">{plan.activeMembers}</span>
                  <span className={cn(
                    "text-[8px] font-black px-1 py-0.5 rounded",
                    plan.trend && plan.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>{plan.trend}</span>
                </div>
              </td>
              <td className="p-3.5">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-slate-900">{formatCompact(plan.revenue)}</span>
                  <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">Contrib: {formatCompact(plan.monthlyContribution)}/mo</span>
                </div>
              </td>
              <td className="p-3.5">
                <div className="flex items-center gap-2.5">
                   <div className="flex-1 min-w-[50px] h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full",
                        plan.retention > 80 ? "bg-emerald-500" : plan.retention > 60 ? "bg-amber-500" : "bg-rose-500"
                      )} style={{ width: `${plan.retention || 0}%` }} />
                   </div>
                   <span className="text-[9px] font-black text-slate-700">{plan.retention || 0}%</span>
                </div>
              </td>
              <td className="p-3.5">
                 <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      plan.status === "Healthy" ? "bg-emerald-500" : 
                      plan.status === "At Risk" ? "bg-rose-500" : "bg-amber-500"
                    )} />
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">{plan.status}</span>
                 </div>
              </td>
              <td className="p-3.5 text-right">
                <button className="p-1.5 rounded-lg text-slate-300 hover:bg-white hover:text-slate-950 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
                  <MoreVertical size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ─────────────────────────────────────────
// RECOMMENDED ACTIONS SECTION
// ─────────────────────────────────────────
const STRATEGIC_TASKS = [
  { title: "Follow Up 28 Expiring Members", impact: "₹2.4L Renewal Revenue", priority: "High", icon: Clock },
  { title: "Convert 17 Monthly to Annual", impact: "₹3.8L Cashflow Boost", priority: "Medium", icon: TrendingUp },
  { title: "Increase Premium Plan Pricing", impact: "+8% Monthly Margin", priority: "Low", icon: ArrowUpRight },
];

const RecommendedActions = () => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between px-1">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Strategic Tasks</h3>
      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">5 Tasks Pending</span>
    </div>
    
    {STRATEGIC_TASKS.map((action, i) => {
      const Icon = action.icon;
      return (
        <div key={i} className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer group shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-all">
              <Icon size={16} />
            </div>
            <div>
              <h4 className="text-[11px] font-black text-slate-950">{action.title}</h4>
              <p className="text-[9px] text-emerald-600 font-bold mt-0.5">Impact: {action.impact}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <span className={cn(
               "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
               action.priority === "High" ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500"
             )}>{action.priority}</span>
             <button className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-200">
               <ChevronRight size={12} />
             </button>
          </div>
        </div>
      );
    })}
  </div>
);

// ─────────────────────────────────────────
// CREATE PLAN WORKFLOW COMPONENT
// ─────────────────────────────────────────
const CreatePlanWorkflow = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    category: "Transformation",
    target: "Professionals",
    goal: "Revenue Generation",
    description: "",
    price: "",
    joiningFee: "",
    duration: "Monthly",
    incentive: "10"
  });
  const totalSteps = 6;

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Identity</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Annual Elite Performance" 
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all appearance-none"
                >
                  <option>Transformation</option>
                  <option>Weight Loss</option>
                  <option>Bodybuilding</option>
                  <option>General Fitness</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Audience</label>
                <select 
                  value={formData.target}
                  onChange={(e) => setFormData({...formData, target: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all appearance-none"
                >
                  <option>Professionals</option>
                  <option>Students</option>
                  <option>Senior Citizens</option>
                  <option>Athletes</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic Goal</label>
                <select 
                  value={formData.goal}
                  onChange={(e) => setFormData({...formData, goal: e.target.value})}
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all appearance-none"
                >
                  <option>Revenue Generation</option>
                  <option>Member Acquisition</option>
                  <option>Retention Focus</option>
                  <option>High-Margin Upsell</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Value proposition..." 
                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none" 
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-indigo-600">Duration Strategy</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["Monthly", "Quarterly", "Half-Yearly", "Annual"].map(d => (
                      <button 
                        key={d} 
                        onClick={() => setFormData({...formData, duration: d})}
                        className={cn(
                          "h-12 rounded-xl border text-xs font-black uppercase tracking-wider transition-all",
                          formData.duration === d ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-inner" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Price</label>
                    <input 
                      type="number" 
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="₹24,999" 
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Joining Fee</label>
                    <input 
                      type="number" 
                      value={formData.joiningFee}
                      onChange={(e) => setFormData({...formData, joiningFee: e.target.value})}
                      placeholder="₹1,500" 
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-950 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16" />
                 <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                   <BarChart3 size={14} /> Revenue Projection
                 </h4>
                 <div className="space-y-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold">Projected ARPU</span>
                      <span className="font-black">₹{formData.price ? formatCompact(Number(formData.price) / (formData.duration === "Annual" ? 12 : formData.duration === "Half-Yearly" ? 6 : formData.duration === "Quarterly" ? 3 : 1)) : "0"} / mo</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold">Annual Target (100)</span>
                      <span className="font-black">₹{formData.price ? formatCompact(Number(formData.price) * 100 * (formData.duration === "Annual" ? 1 : formData.duration === "Half-Yearly" ? 2 : formData.duration === "Quarterly" ? 4 : 12)) : "0"}</span>
                    </div>
                    <div className="h-px bg-white/10 my-4" />
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest">Business Value Score</span>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-1 rounded-full bg-indigo-500" />)}
                        </div>
                      </div>
                      <span className="text-2xl font-black tracking-tighter text-white">88/100</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                 <h4 className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Lock size={14} /> Facility Access Rules
                 </h4>
                 <div className="space-y-3">
                   {["Single Branch Access", "All-Network Roaming", "Priority Time Slots", "Guest Pass Eligibility", "Freeze Support"].map(rule => (
                     <label key={rule} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 transition-all">
                       <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 border-slate-300" />
                       <span className="text-xs font-bold text-slate-700">{rule}</span>
                     </label>
                   ))}
                 </div>
              </div>
              <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                 <h4 className="text-[10px] font-black text-slate-950 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Briefcase size={14} /> Area Permissions
                 </h4>
                 <div className="grid grid-cols-2 gap-2">
                   {["Gym Floor", "Cardio Zone", "Steam/Sauna", "Group Classes", "Personal Training", "Locker Premium"].map(area => (
                     <button key={area} className="p-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-950 hover:text-white transition-all">{area}</button>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Benefits Builder</h4>
              <button className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">+ Custom</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: "Diet Chart", icon: Activity },
                { name: "Consultation", icon: Users },
                { name: "Assessment", icon: Target },
                { name: "Priority Support", icon: Shield },
                { name: "Premium Access", icon: Sparkles },
                { name: "Complimentary PT", icon: Award }
              ].map(benefit => (
                <div key={benefit.name} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-400 transition-all flex flex-col items-center text-center gap-3 cursor-pointer group shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-all">
                    <benefit.icon size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{benefit.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-8">
            <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                  <RefreshCcw size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">Retention Engine</h4>
                  <p className="text-[11px] text-slate-500 font-bold mt-1">Configure automated triggers to maximize retention.</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Timeline</label>
                <div className="space-y-2">
                  {["30 Days Before", "15 Days Before", "7 Days Before", "3 Days Before", "On Expiry"].map(t => (
                    <div key={t} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <span className="text-xs font-bold text-slate-700">{t}</span>
                      <div className="w-10 h-5 bg-slate-200 rounded-full relative">
                        <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-6">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Incentives</label>
                    <div className="grid grid-cols-2 gap-3">
                       <button className="p-3 rounded-xl border-2 border-indigo-500 bg-indigo-50 text-[10px] font-black uppercase tracking-wider text-indigo-700">Early Renewal</button>
                       <button className="p-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-wider text-slate-600">Upgrade Bonus</button>
                    </div>
                    <div className="space-y-2 mt-4">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Incentive Value (%)</label>
                       <input 
                         type="number" 
                         value={formData.incentive}
                         onChange={(e) => setFormData({...formData, incentive: e.target.value})}
                         className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-black" 
                       />
                    </div>
                 </div>
                 
                 <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest leading-relaxed">
                      Retention Impact: +{(Number(formData.incentive) * 1.8).toFixed(1)}%
                    </p>
                 </div>
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-8">
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-50">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Ready for Launch</h3>
              <p className="text-sm font-bold text-slate-500 mt-2 max-w-sm">Review metrics before publishing the plan.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Revenue potential</span>
                <span className="text-xl font-black text-slate-950">₹{formData.price ? formatCompact(Number(formData.price) * 100 * (formData.duration === "Annual" ? 1 : formData.duration === "Half-Yearly" ? 2 : formData.duration === "Quarterly" ? 4 : 12)) : "0"} / yr</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Retention Forecast</span>
                <span className="text-xl font-black text-slate-950">{(70 + (Number(formData.incentive) * 1.2)).toFixed(0)}%</span>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Market Position</span>
                <span className="text-xl font-black text-slate-950">Strategic</span>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[90vh]"
      >
        <header className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
             <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-indigo-100">
               {step}
             </span>
             <h2 className="text-lg font-black text-slate-950 uppercase tracking-tight">Create Business Plan</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-950 transition-colors">
            <X size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
           {renderStep()}
        </div>

        <footer className="px-10 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex gap-2">
             {[1,2,3,4,5,6].map(i => (
               <div key={i} className={cn(
                 "w-8 h-1 rounded-full transition-all",
                 step === i ? "bg-indigo-600 w-12" : i < step ? "bg-emerald-500" : "bg-slate-200"
               )} />
             ))}
           </div>
           
           <div className="flex gap-4">
             {step > 1 && (
               <button 
                 onClick={() => setStep(s => s - 1)}
                 className="px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-white transition-all border border-transparent hover:border-slate-200"
               >
                 Previous
               </button>
             )}
             <button 
               onClick={() => step < totalSteps ? setStep(s => s + 1) : onClose()}
               className="px-8 h-12 rounded-xl bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
             >
               {step === totalSteps ? "Publish Plan" : "Continue"}
               <ArrowRight size={16} />
             </button>
           </div>
        </footer>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────
const MembershipPortfolioDashboard = () => {
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);

  return (
    <div className="min-h-full bg-slate-50/30 text-slate-950 font-sans selection:bg-indigo-100 overflow-x-hidden">
      <header className="sticky top-0 z-50 h-[64px] bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-200">
               <Shield size={18} />
            </div>
            <div>
               <h1 className="text-base font-black tracking-tight text-slate-950">Membership Portfolio</h1>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0 flex items-center gap-1">
                  <Activity size={8} className="text-emerald-500" />
                  Live Network Status
               </p>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg">
               <button className="px-3 py-1.5 bg-white rounded-md shadow-sm text-[9px] font-black uppercase tracking-wider text-slate-950">Portfolio</button>
               <button className="px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700">Analytics</button>
            </div>
            <button 
              onClick={() => setIsWorkflowOpen(true)}
              className="h-10 px-5 rounded-xl bg-indigo-600 text-white flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
               <Plus size={16} />
               New Plan
            </button>
         </div>
      </header>

      <main className="p-5 max-w-[1400px] mx-auto space-y-6 pb-20 overflow-x-hidden">
         <section>
            <CommandCenter />
         </section>

         <section>
            <IntelligenceCenter />
         </section>

         <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
            <section className="space-y-5">
               <PortfolioTable />
            </section>
            <aside className="space-y-6">
               <RecommendedActions />
               <div className="p-5 rounded-[20px] bg-indigo-600 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                     <Award size={64} />
                  </div>
                  <h4 className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-3">Ecosystem Health</h4>
                  <p className="text-lg font-black leading-tight">Revenue growth is 14% higher than previous quarter.</p>
                  <button className="mt-5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-100 hover:text-white transition-colors">
                     Analyze
                     <ArrowRight size={12} />
                  </button>
               </div>
            </aside>
         </div>

         <section className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
               {MEMBERSHIP_PORTFOLIO.slice(0, 3).map((plan, i) => (
                 <div key={i} className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                    <div className="flex items-center gap-3.5 mb-6">
                       <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-base shadow-lg shadow-slate-200">
                          {plan.id && plan.id.includes('-') ? plan.id.split('-')[1] : 'PL'}
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-slate-950 leading-tight">{plan.name}</h4>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{plan.category}</span>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                       <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Revenue</span>
                          <span className="text-base font-black text-slate-950">{formatCompact(plan.revenue)}</span>
                       </div>
                       <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Members</span>
                          <span className="text-base font-black text-slate-950">{plan.activeMembers}</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 mb-6">
                       <div className="text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Reten.</span>
                          <span className="text-[11px] font-black text-emerald-600">{plan.retention}%</span>
                       </div>
                       <div className="text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Growth</span>
                          <span className="text-[11px] font-black text-indigo-600">{plan.trend}</span>
                       </div>
                       <div className="text-center">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Risk</span>
                          <span className={cn("text-[11px] font-black", plan.risk === "Low" ? "text-emerald-600" : "text-rose-600")}>{plan.risk}</span>
                       </div>
                    </div>
                    <button className="w-full h-10 rounded-lg bg-slate-950 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Deep Analysis</button>
                 </div>
               ))}
            </div>
         </section>
      </main>

      <AnimatePresence>
        {isWorkflowOpen && <CreatePlanWorkflow isOpen={isWorkflowOpen} onClose={() => setIsWorkflowOpen(false)} />}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNT UTILITY
// ─────────────────────────────────────────
export function mountMembershipPlans() {
  const stage = document.querySelector('[data-stage="membership-plans"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.className = "min-h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <MembershipPortfolioDashboard />
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Mount Error:", err);
    return null;
  }
}

export default MembershipPortfolioDashboard;
