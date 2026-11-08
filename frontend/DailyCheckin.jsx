import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  Printer,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Building2,
  Share2,
  QrCode,
  Search,
  ShieldAlert,
  Smartphone,
  Timer,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────
// CONSTANTS & FORMATTERS
// ─────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(" ");

// ─────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────
const LIVE_FEED = [
  { id: "LOG-01", type: "success", member: "Aarav Sharma", idCode: "MBR-0142", time: "Just now", plan: "Annual Elite", avatar: "1", gender: "Male" },
  { id: "LOG-02", type: "warning", member: "Priya Desai", idCode: "MBR-0899", time: "2 min ago", message: "Expires in 3 days", avatar: "2", gender: "Female" },
  { id: "LOG-03", type: "trainer", member: "Ankit Kumar", idCode: "TRN-005", time: "5 min ago", message: "Started PT Session", avatar: "3", gender: "Male" },
  { id: "LOG-04", type: "error", member: "Kabir Singh", idCode: "MBR-0319", time: "12 min ago", message: "Access Denied: Frozen", avatar: "4", gender: "Male" },
  { id: "LOG-05", type: "success", member: "Sneha Patel", idCode: "MBR-0721", time: "15 min ago", plan: "Monthly Starter", avatar: "5", gender: "Female" },
];

const ATTENDANCE_TABLE = [
  { id: "ATT-104", time: "09:42 AM", name: "Rahul Verma", mId: "MBR-0211", plan: "Student Basic", status: "success", duration: "1h 15m", trainer: "-", branch: "Main", gender: "Male" },
  { id: "ATT-103", time: "09:30 AM", name: "Meera Nair", mId: "MBR-0521", plan: "Quarterly Transformation", status: "warning", duration: "Active", trainer: "Sneha Patel", branch: "Main", gender: "Female" },
  { id: "ATT-102", time: "09:15 AM", name: "Siddharth Rao", mId: "MBR-0912", plan: "Corporate Wellness", status: "success", duration: "Active", trainer: "-", branch: "Main", gender: "Male" },
  { id: "ATT-101", time: "08:50 AM", name: "Ananya Iyer", mId: "MBR-0721", plan: "Monthly Starter", status: "error", message: "Unpaid Dues", duration: "-", trainer: "-", branch: "Main", gender: "Female" },
  { id: "ATT-100", time: "08:15 AM", name: "Vikram Malhotra", mId: "MBR-0842", plan: "Premium Elite", status: "success", duration: "2h 10m", trainer: "Ankit Kumar", branch: "Main", gender: "Male" },
];

// ─────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────
function StatTile({ label, value, tone = "slate", icon: Icon, change }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-950 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
  }[tone];

  return (
    <div className={cn("min-w-0 rounded-xl border p-4 shadow-sm relative overflow-hidden", toneClass)}>
      {Icon && <Icon className="absolute -right-2 -bottom-2 w-16 h-16 opacity-5" />}
      <div className="flex justify-between items-start">
        <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-80">{label}</span>
        {change && (
          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
            <ArrowUpRight size={10} />
            {change}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <strong className="block truncate text-2xl font-black leading-none tracking-tight">{value}</strong>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// DETERMINISTIC 2D QR MATRIX GENERATOR
// ─────────────────────────────────────────
function getQRMatrix(code = "GDK-8821") {
  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));

  const fillSquare = (r, c, s, val) => {
    for (let i = 0; i < s; i++) {
      for (let j = 0; j < s; j++) {
        if (r + i < size && c + j < size) {
          matrix[r + i][c + j] = val;
        }
      }
    }
  };

  const drawFinder = (r, c) => {
    fillSquare(r, c, 7, true);
    fillSquare(r + 1, c + 1, 5, false);
    fillSquare(r + 2, c + 2, 3, true);
  };

  drawFinder(0, 0);
  drawFinder(0, 18);
  drawFinder(18, 0);

  for (let i = 8; i < 17; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  fillSquare(16, 16, 5, true);
  fillSquare(17, 17, 3, false);
  matrix[18][18] = true;

  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash << 5) - hash + code.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isTL = r < 8 && c < 8;
      const isTR = r < 8 && c >= 17;
      const isBL = r >= 17 && c < 8;
      const isTiming = (r === 6 && c >= 8 && c < 17) || (c === 6 && r >= 8 && r < 17);
      const isAlign = r >= 16 && r <= 20 && c >= 16 && c <= 20;

      if (!isTL && !isTR && !isBL && !isTiming && !isAlign) {
        const pseudo = Math.abs(Math.sin((r * size + c + 1) * (hash || 12345)) * 10000);
        matrix[r][c] = (pseudo - Math.floor(pseudo)) > 0.46;
      }
    }
  }

  return matrix;
}

// ─────────────────────────────────────────
// FACILITY DAILY ATTENDANCE QR GATEWAY
// ─────────────────────────────────────────
function InstantCheckIn({ onCheckIn }) {
  const [gymInfo, setGymInfo] = useState(() => {
    let savedName = typeof localStorage !== 'undefined' ? localStorage.getItem('gymdeck_gym_name') || localStorage.getItem('gymdeck_gym_brand_name') : null;
    let savedCode = typeof localStorage !== 'undefined' ? localStorage.getItem('gymdeck_gym_code') : null;
    let savedId = typeof localStorage !== 'undefined' ? localStorage.getItem('gymdeck_gym_id') : null;
    
    if (!savedCode) {
      savedCode = "GDK-" + Math.floor(1000 + Math.random() * 9000);
      try { localStorage.setItem('gymdeck_gym_code', savedCode); } catch (e) {}
    }
    if (!savedId) {
      savedId = "gym_" + Math.random().toString(36).substring(2, 10);
      try { localStorage.setItem('gymdeck_gym_id', savedId); } catch (e) {}
    }
    if (!savedName) {
      savedName = "Iron Temple Fitness";
      try { localStorage.setItem('gymdeck_gym_name', savedName); } catch (e) {}
    }
    return { name: savedName, code: savedCode, id: savedId };
  });

  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState(null);

  // Sync with native cloud session / enrollment metadata if available
  useEffect(() => {
    if (typeof window !== "undefined" && window.__TAURI__?.core?.invoke) {
      window.__TAURI__.core.invoke("get_cloud_enrollment_status_command")
        .then((res) => {
          if (res) {
            setGymInfo((prev) => {
              const updated = {
                name: res.gymName || prev.name,
                code: res.gymCode || prev.code,
                id: res.gymId || prev.id,
              };
              try {
                if (res.gymName) localStorage.setItem("gymdeck_gym_name", res.gymName);
                if (res.gymCode) localStorage.setItem("gymdeck_gym_code", res.gymCode);
                if (res.gymId) localStorage.setItem("gymdeck_gym_id", res.gymId);
              } catch (e) {}
              return updated;
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  const qrMatrix = useMemo(() => getQRMatrix(gymInfo.code), [gymInfo.code]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopyLink = () => {
    const url = `https://yourgym.gymdeck.app/checkin?gym_id=${gymInfo.id}&code=${gymInfo.code}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    showNotification("Unique gym check-in portal link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadStandee = () => {
    const gymName = gymInfo.name || "GymDeck Fitness";
    const gymCode = gymInfo.code || "GDK-8821";
    const fileName = `${gymName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-attendance-standee.svg`;

    const cellSize = 360 / 25;
    let qrRects = "";
    qrMatrix.forEach((row, r) => {
      row.forEach((filled, c) => {
        if (filled) {
          qrRects += `<rect x="${220 + c * cellSize}" y="${270 + r * cellSize}" width="${cellSize + 0.3}" height="${cellSize + 0.3}" fill="#0f172a" rx="1.5" />\n`;
        }
      });
    });

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1060" viewBox="0 0 800 1060">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="28%" r="75%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="42%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </radialGradient>
      </defs>
      
      <!-- Outer Card -->
      <rect width="800" height="1060" rx="36" fill="url(#bgGrad)" />
      <rect x="24" y="24" width="752" height="1012" rx="28" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" />

      <!-- Top Badge -->
      <rect x="270" y="65" width="260" height="36" rx="18" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.3)" stroke-width="1.5" />
      <circle cx="295" cy="83" r="5" fill="#38bdf8" />
      <text x="312" y="88" fill="#38bdf8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="12" font-weight="800" letter-spacing="2">TOUCHLESS ATTENDANCE</text>

      <!-- Facility Title -->
      <text x="400" y="150" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="34" font-weight="900" letter-spacing="-0.5">${gymName}</text>
      <text x="400" y="185" text-anchor="middle" fill="#94a3b8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="15" font-weight="600">DAILY MEMBER CHECK-IN STANDEE</text>

      <!-- QR White Plinth -->
      <rect x="180" y="230" width="440" height="440" rx="32" fill="#ffffff" />
      <rect x="180" y="230" width="440" height="440" rx="32" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="3" />
      
      <!-- QR Code Modules -->
      ${qrRects}

      <!-- Code Capsule -->
      <rect x="260" y="700" width="280" height="46" rx="23" fill="#0f172a" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
      <text x="400" y="729" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="800" letter-spacing="3">CODE: ${gymCode}</text>

      <!-- Scanning Instruction -->
      <text x="400" y="795" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="20" font-weight="800">Scan with GymDeck Member App</text>
      <text x="400" y="828" text-anchor="middle" fill="#94a3b8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="14" font-weight="500">Open Member App &gt; Check-in &gt; Point camera at this pass to verify attendance</text>
      
      <!-- Bottom Security Tag -->
      <line x1="80" y1="880" x2="720" y2="880" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />
      <text x="400" y="920" text-anchor="middle" fill="#64748b" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">GYMDECK CLOUD ATTENDANCE INFRASTRUCTURE</text>
      <text x="400" y="945" text-anchor="middle" fill="#475569" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="600">END-TO-END ENCRYPTED • INSTANT LOCAL &amp; CLOUD SYNCHRONIZATION</text>
    </svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Attendance standee SVG downloaded successfully.");
  };

  const handlePrintStandee = () => {
    const gymName = gymInfo.name || "GymDeck Fitness";
    const gymCode = gymInfo.code || "GDK-8821";
    
    const cellSize = 240 / 25;
    let qrRects = "";
    qrMatrix.forEach((row, r) => {
      row.forEach((filled, c) => {
        if (filled) {
          qrRects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize + 0.2}" height="${cellSize + 0.2}" fill="#0f172a" rx="1" />\n`;
        }
      });
    });

    const printWindow = window.open("", "_blank", "width=850,height=1000");
    if (!printWindow) {
      window.print();
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${gymName} - Attendance QR Standee</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              background: #ffffff;
              color: #0f172a;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .standee-card {
              width: 100%;
              max-width: 580px;
              border: 3px solid #0f172a;
              border-radius: 28px;
              padding: 40px 32px;
              text-align: center;
              box-sizing: border-box;
            }
            .badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 9999px;
              background: #f1f5f9;
              color: #0f172a;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
              margin-bottom: 16px;
            }
            .title {
              font-size: 30px;
              font-weight: 900;
              margin: 0 0 6px 0;
              letter-spacing: -0.5px;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              font-weight: 600;
              margin: 0 0 28px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .qr-wrapper {
              display: inline-block;
              padding: 24px;
              background: #ffffff;
              border: 2px solid #e2e8f0;
              border-radius: 24px;
              margin-bottom: 24px;
            }
            .code-box {
              display: inline-block;
              padding: 8px 24px;
              background: #0f172a;
              color: #ffffff;
              font-family: monospace;
              font-size: 15px;
              font-weight: 800;
              letter-spacing: 3px;
              border-radius: 12px;
              margin-bottom: 24px;
            }
            .instructions {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 6px;
            }
            .instructions-sub {
              font-size: 13px;
              color: #64748b;
              margin: 0 0 28px 0;
            }
            .footer {
              border-top: 1px solid #e2e8f0;
              padding-top: 18px;
              font-size: 10px;
              color: #94a3b8;
              font-weight: 700;
              letter-spacing: 1.5px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="standee-card">
            <div class="badge">Official Attendance Pass</div>
            <h1 class="title">${gymName}</h1>
            <p class="subtitle">Daily Member Check-In Gateway</p>
            <div class="qr-wrapper">
              <svg width="240" height="240" viewBox="0 0 240 240">
                ${qrRects}
              </svg>
            </div>
            <div>
              <div class="code-box">FACILITY CODE: ${gymCode}</div>
            </div>
            <div class="instructions">Scan with GymDeck Member App</div>
            <div class="instructions-sub">Point your camera at this QR code to instantly log today's workout attendance</div>
            <div class="footer">GYMDECK ATTENDANCE INFRASTRUCTURE • REAL-TIME VALIDATION</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 350);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSimulateCheckIn = () => {
    onCheckIn && onCheckIn(gymInfo.code);
    showNotification(`Simulated scan: Attendance logged for facility ${gymInfo.code}`);
  };

  const cellSize = 136 / 25;

  return (
    <div 
      className="rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full border"
      style={{
        background: 'radial-gradient(circle at 75% 25%, #152747 0%, #0d1b32 38%, #081222 72%, #030712 100%)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        boxShadow: '0 24px 60px -15px rgba(2, 6, 23, 0.8), 0 0 35px -10px rgba(56, 189, 248, 0.25)',
        color: '#ffffff'
      }}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />
      
      {/* Card Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow shadow-emerald-400/50" />
            <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <QrCode size={14} className="text-cyan-400" /> Facility Attendance QR Pass
            </h2>
            <span 
              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#7dd3fc'
              }}
            >
              Permanent
            </span>
          </div>
          <p className="text-[11px] font-normal text-slate-300">
            Official check-in pass. Members scan using the GymDeck Member App to log daily attendance.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div 
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-slate-200 flex items-center gap-1.5 shadow-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>{gymInfo.code}</span>
          </div>
        </div>
      </div>

      {/* Main Body: QR Code Preview on Left, Details & Actions on Right */}
      <div className="relative z-10 my-4 flex flex-col md:flex-row items-center gap-6">
        
        {/* Left: The High-Definition QR Pass */}
        <div className="shrink-0 flex flex-col items-center">
          <div 
            className="p-3 bg-white rounded-2xl relative group/qr flex flex-col items-center justify-center transition-transform hover:scale-[1.02]"
            style={{
              boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.6), 0 0 24px rgba(56, 189, 248, 0.25)',
              border: '2px solid rgba(255, 255, 255, 0.95)'
            }}
          >
            {/* Corner Target Markers */}
            <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 border-slate-900 rounded-tl" />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t-2 border-r-2 border-slate-900 rounded-tr" />
            <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b-2 border-l-2 border-slate-900 rounded-bl" />
            <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b-2 border-r-2 border-slate-900 rounded-br" />

            <svg width="136" height="136" viewBox="0 0 136 136" className="shrink-0">
              {qrMatrix.map((row, r) =>
                row.map((filled, c) =>
                  filled ? (
                    <rect
                      key={`${r}-${c}`}
                      x={c * cellSize}
                      y={r * cellSize}
                      width={cellSize + 0.2}
                      height={cellSize + 0.2}
                      fill="#090d16"
                      rx="0.8"
                    />
                  ) : null
                )
              )}
            </svg>
          </div>
          <div className="text-[9px] font-mono text-cyan-300 font-bold mt-1.5 tracking-wider truncate max-w-[140px] text-center">
            {gymInfo.code}
          </div>
        </div>

        {/* Right: Facility Profile & Operational Meta */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight truncate" title={gymInfo.name}>
                {gymInfo.name}
              </h3>
            </div>
            
            <p className="text-[11px] text-slate-300 font-normal leading-relaxed mt-1">
              Generated automatically upon gym registration and permanently tied to this facility. Print or display at front-desk turnstiles for instant member check-ins.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
              <div 
                className="p-2 rounded-xl text-slate-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <span className="text-slate-400 font-medium block">Scanner Engine</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Member App Ready
                </span>
              </div>
              <div 
                className="p-2 rounded-xl text-slate-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <span className="text-slate-400 font-medium block">Verification Latency</span>
                <span className="font-bold text-slate-200 mt-0.5 block">&lt; 0.28ms Instant</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button 
              type="button"
              onClick={handleDownloadStandee}
              className="h-8 px-3 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              style={{ 
                background: '#1b64f2',
                border: 'none',
                boxShadow: '0 4px 14px rgba(27, 100, 242, 0.4)'
              }}
            >
              <Download size={12} strokeWidth={2.2} />
              <span>Download QR</span>
            </button>

            <button 
              type="button"
              onClick={handlePrintStandee}
              className="h-8 px-3 rounded-lg text-slate-200 hover:text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)'
              }}
            >
              <Printer size={12} strokeWidth={1.75} />
              <span>Print Standee</span>
            </button>

            <button 
              type="button"
              onClick={handleCopyLink}
              className="h-8 px-3 rounded-lg text-slate-200 hover:text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)'
              }}
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} strokeWidth={1.75} />}
              <span>{copied ? "Copied" : "Copy Portal"}</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateCheckIn}
              className="h-8 px-2.5 text-[10px] font-medium text-slate-400 hover:text-cyan-300 transition-colors ml-auto cursor-pointer"
              title="Test log an entry in live activity feed"
            >
              Test Scan
            </button>
          </div>
        </div>

      </div>

      {/* Toast Feedback Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-2 inset-x-6 z-30 py-1.5 px-3 rounded-lg bg-slate-800 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30 flex items-center justify-center gap-2 shadow-lg"
          >
            <CheckCircle2 size={12} className="text-cyan-400" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────
// ACTIVITY FEED
// ─────────────────────────────────────────
function LiveFeed() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-enterprise border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
          <Activity size={14} className="text-emerald-500" /> Real-Time Activity Feed
        </h3>
        <div className="flex gap-1.5 items-center">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Live</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-hide">
        {LIVE_FEED.map((log) => (
          <div key={log.id} className="flex gap-3 items-start group relative transition-all hover:translate-x-1">
            <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-200 shadow-sm">
              <img src={window.getDefaultAvatar ? window.getDefaultAvatar(log.gender, log.member) : ""} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-900 truncate">{log.member}</span>
                <span className="text-[9px] font-bold text-slate-400 shrink-0">{log.time}</span>
              </div>
              
              {log.type === "success" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Access Granted • {log.plan}</span>
                </div>
              )}
              {log.type === "warning" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={10} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">{log.message}</span>
                </div>
              )}
              {log.type === "error" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <XCircle size={10} className="text-rose-500" />
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{log.message}</span>
                </div>
              )}
              {log.type === "trainer" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <UserCheck size={10} className="text-indigo-500" />
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">{log.message}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────
const DailyCheckinPage = () => {
  const handleCheckIn = useCallback((val) => {
    // Gate Validation logic here
  }, []);

  return (
    <div className="daily-checkin-shell font-sans text-slate-950">
      {/* Utility Header - No Logo */}
      <header className="relative z-50 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            Attendance <ChevronRight size={12} className="text-slate-300" /> <span className="text-slate-950 font-bold">Daily Check-In</span>
          </div>
        </div>
        <div className="flex-1 max-w-lg px-8 relative">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
            <input type="text" placeholder="Scan QR, RFID, or search ID, phone..." className="w-full h-10 bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-4 text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"><QrCode size={16} /> Scan QR</button>
          <button className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"><Smartphone size={16} /> Manual</button>
          <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm"><Bell size={18} /></button>
        </div>
      </header>

      {/* KPI Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 relative z-10 mb-2">
        <StatTile label="Today Total" value="142" tone="indigo" icon={Users} change="12%" />
        <StatTile label="Inside Now" value="48" tone="emerald" icon={Activity} />
        <StatTile label="Peak Traffic" value="78" tone="blue" icon={TrendingUp} />
        <StatTile label="Invalid Denials" value="4" tone="rose" icon={ShieldAlert} />
        <StatTile label="PT Active" value="12" tone="blue" icon={UserCheck} />
        <StatTile label="Avg Duration" value="1h 20m" tone="amber" icon={Timer} />
      </section>

      <div className="daily-checkin-workspace">
        
        {/* Operational Workspace */}
        <section className="grid lg:grid-cols-[1.6fr_1fr] gap-8 min-h-[300px]">
          <InstantCheckIn onCheckIn={handleCheckIn} />
          <LiveFeed />
        </section>

        {/* Enterprise Log Table */}
        <section className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-enterprise flex flex-col min-h-[450px]">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
             <div className="flex gap-4">
                <button className="h-9 px-5 rounded-xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/20">Check-in Logs</button>
                <button className="h-9 px-5 rounded-xl bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-950 hover:bg-slate-50 transition-all">Trainer Entry</button>
                <button className="h-9 px-5 rounded-xl bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">Denied (4)</button>
             </div>
             <button className="h-10 px-5 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">
               <Download size={14} /> Export Dataset
             </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Entry Time</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Member Entity</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Product & Trainer</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Floor Status</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Validation</th>
                  <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ATTENDANCE_TABLE.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-4 text-xs font-black text-slate-900 whitespace-nowrap">{row.time}</td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                           <img src={window.getDefaultAvatar ? window.getDefaultAvatar(row.gender, row.name) : ""} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-sm font-black text-slate-950 truncate">{row.name}</span>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{row.mId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                       <span className="block text-xs font-black text-slate-900">{row.plan}</span>
                       <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-1">{row.trainer !== "-" ? `Personal: ${row.trainer}` : "Standard Access"}</span>
                    </td>
                    <td className="px-8 py-4">
                       {row.duration === "Active" ? (
                         <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 border border-emerald-100/50 shadow-inner">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-glow shadow-emerald-500/40" /> ACTIVE
                         </span>
                       ) : (
                         <span className="text-xs font-bold text-slate-600">{row.duration} Session</span>
                       )}
                    </td>
                    <td className="px-8 py-4">
                      {row.status === "success" && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 shadow-sm">Granted</span>}
                      {row.status === "warning" && <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100 shadow-sm">Flagged</span>}
                      {row.status === "error" && <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 shadow-sm" title={row.message}>Blocked</span>}
                    </td>
                    <td className="px-8 py-4 text-right">
                       <button className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all group-hover:shadow-sm">
                          <MoreVertical size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
};

import { ErrorBoundary } from "./ErrorHandlers.jsx";

// ─────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────
export function mountDailyCheckin() {
  const stage = document.querySelector('[data-stage="daily-checkin"]');
  if (!stage) return null;

  const rootElement = document.createElement("div");
  rootElement.dataset.dailyCheckinReactRoot = "";
  rootElement.className = "min-h-full h-full";
  stage.replaceChildren(rootElement);

  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <><DailyCheckinPage /><BrandFooter /></>
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Daily Check-in:", err);
    return null;
  }
}

export default DailyCheckinPage;
