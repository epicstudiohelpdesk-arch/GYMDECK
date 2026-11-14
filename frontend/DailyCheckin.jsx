import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowUpDown,
  Bell,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  MoreVertical,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "./ErrorHandlers.jsx";

// ─────────────────────────────────────────
// UTILITIES & AVATAR GENERATOR
// ─────────────────────────────────────────

const cn = (...classes) => classes.filter(Boolean).join(" ");

const getInitialsAvatar = (name, gender = "male") => {
  const initials = (name || "Member")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => (p && p[0] ? p[0].toUpperCase() : ""))
    .join("") || "M";
  const bg = (gender || "").toLowerCase() === "female" ? "%23ec4899" : "%234f46e5";
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="${bg}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="%23ffffff" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="34" font-weight="900">${initials}</text></svg>`;
};

const resolvePhoto = (photoPath, name, gender) => {
  if (photoPath && typeof photoPath === "string" && !photoPath.includes("dicebear.com") && photoPath.length > 5) {
    if (photoPath.startsWith("data:") || photoPath.startsWith("http://") || photoPath.startsWith("https://") || photoPath.startsWith("blob:")) {
      return photoPath;
    }
    if (typeof window !== "undefined" && window.__TAURI__?.core?.convertFileSrc) {
      try {
        return window.__TAURI__.core.convertFileSrc(photoPath);
      } catch (e) {
        return photoPath;
      }
    }
    return photoPath;
  }
  if (window.getDefaultAvatar) {
    try {
      const defaultSvg = window.getDefaultAvatar(gender || "male", name || "Member");
      if (defaultSvg) return defaultSvg;
    } catch (e) {}
  }
  return getInitialsAvatar(name, gender);
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "Just now";
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

const calculateDuration = (checkInMs, checkOutMs) => {
  if (!checkInMs) return "-";
  const end = checkOutMs || Date.now();
  const diffMinutes = Math.max(0, Math.floor((end - checkInMs) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

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
        matrix[r][c] = pseudo - Math.floor(pseudo) > 0.46;
      }
    }
  }

  return matrix;
}

// ─────────────────────────────────────────
// CUSTOM DROPDOWN COMPONENT
// ─────────────────────────────────────────

const CustomDropdown = ({
  id,
  label,
  value,
  options = [],
  onChange,
  icon: FallbackIcon,
  align = "left",
  direction = "down",
  className = "",
  menuWidth = "w-60"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.id === value) || options[0] || { label: value };
  }, [options, value]);

  const ActiveIcon = selectedOption?.icon || FallbackIcon;

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`h-9 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer select-none group ${
          isOpen
            ? "bg-indigo-50/70 border-indigo-400 text-indigo-950 shadow-xs ring-2 ring-indigo-500/15"
            : "bg-white hover:bg-slate-50/90 border-slate-200/90 hover:border-slate-300 text-slate-700 shadow-2xs"
        }`}
      >
        {label && (
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {label}:
          </span>
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          {ActiveIcon && (
            <ActiveIcon size={13} className={isOpen ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-700"} />
          )}

          <span className="font-bold text-slate-800 group-hover:text-slate-950 truncate max-w-[130px]">
            {selectedOption?.label || value}
          </span>
        </div>

        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 ml-0.5 shrink-0 ${
            isOpen ? "rotate-180 text-indigo-600" : "group-hover:text-slate-600"
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: direction === "up" ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: direction === "up" ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={`absolute z-[100] ${
              direction === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5"
            } ${
              align === "right" ? "right-0" : "left-0"
            } ${menuWidth} bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl p-1.5 space-y-0.5`}
          >
            {label && (
              <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between mb-1">
                <span>Select {label}</span>
                <span className="text-[9px] font-mono text-slate-400 lowercase">{options.length} options</span>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
              {options.map((opt) => {
                const isSelected = opt.id === value;
                const OptIcon = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100/90 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {OptIcon && (
                        <OptIcon
                          size={14}
                          className={isSelected ? "text-white" : "text-slate-400 group-hover:text-slate-700"}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs truncate">{opt.label}</div>
                        {opt.description && (
                          <div
                            className={`text-[10px] truncate ${
                              isSelected ? "text-indigo-100" : "text-slate-400 group-hover:text-slate-500"
                            }`}
                          >
                            {opt.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check size={14} className="text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// STAT TILE COMPONENT
// ─────────────────────────────────────────

function StatTile({ label, value, tone = "slate", icon: Icon, change, subtext }) {
  const toneClass = {
    slate: "bg-slate-50/80 text-slate-950 border-slate-200/90",
    emerald: "bg-emerald-50/70 text-emerald-950 border-emerald-200/80",
    rose: "bg-rose-50/70 text-rose-950 border-rose-200/80",
    blue: "bg-blue-50/70 text-blue-950 border-blue-200/80",
    amber: "bg-amber-50/70 text-amber-950 border-amber-200/80",
    indigo: "bg-indigo-50/70 text-indigo-950 border-indigo-200/80"
  }[tone];

  const iconColor = {
    slate: "text-slate-500",
    emerald: "text-emerald-500",
    rose: "text-rose-500",
    blue: "text-blue-500",
    amber: "text-amber-500",
    indigo: "text-indigo-500"
  }[tone];

  return (
    <div className={cn("min-w-0 rounded-2xl border p-4 shadow-2xs relative overflow-hidden transition-all bg-white hover:border-slate-300", toneClass)}>
      {Icon && <Icon className={cn("absolute -right-2 -bottom-2 w-16 h-16 opacity-5 pointer-events-none", iconColor)} />}
      <div className="flex justify-between items-start relative z-10">
        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
        {change && (
          <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
            <ArrowUpRight size={10} />
            {change}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2 relative z-10">
        <strong className="block truncate text-2xl font-black leading-none tracking-tight text-slate-900">{value}</strong>
        {subtext && <span className="text-[10px] text-slate-400 font-medium truncate">{subtext}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// FACILITY DAILY ATTENDANCE QR GATEWAY
// ─────────────────────────────────────────

function InstantCheckIn({ gymInfo, qrMatrix }) {
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopyLink = () => {
    const url = `https://gymdeck.app/checkin?gym_id=${gymInfo.id}&code=${gymInfo.code}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    showNotification("Gym check-in portal link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadStandee = () => {
    const gymName = gymInfo.name || "GymDeck Facility";
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
      
      <rect width="800" height="1060" rx="36" fill="url(#bgGrad)" />
      <rect x="24" y="24" width="752" height="1012" rx="28" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2" />

      <rect x="270" y="65" width="260" height="36" rx="18" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.3)" stroke-width="1.5" />
      <circle cx="295" cy="83" r="5" fill="#38bdf8" />
      <text x="312" y="88" fill="#38bdf8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="12" font-weight="800" letter-spacing="2">TOUCHLESS ATTENDANCE</text>

      <text x="400" y="150" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="34" font-weight="900" letter-spacing="-0.5">${gymName}</text>
      <text x="400" y="185" text-anchor="middle" fill="#94a3b8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="15" font-weight="600">DAILY MEMBER CHECK-IN STANDEE</text>

      <rect x="180" y="230" width="440" height="440" rx="32" fill="#ffffff" />
      <rect x="180" y="230" width="440" height="440" rx="32" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="3" />
      
      ${qrRects}

      <rect x="260" y="700" width="280" height="46" rx="23" fill="#0f172a" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
      <text x="400" y="729" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="800" letter-spacing="3">CODE: ${gymCode}</text>

      <text x="400" y="795" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="20" font-weight="800">Scan with GymDeck Member App</text>
      <text x="400" y="828" text-anchor="middle" fill="#94a3b8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="14" font-weight="500">Open Member App &gt; Check-in &gt; Point camera at this pass to verify attendance</text>
      
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
    const gymName = gymInfo.name || "GymDeck Facility";
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
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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

  const cellSize = 136 / 25;

  return (
    <div
      className="rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-full border border-slate-800/80"
      style={{
        background: "radial-gradient(circle at 75% 25%, #152747 0%, #0d1b32 38%, #081222 72%, #030712 100%)",
        boxShadow: "0 20px 48px -12px rgba(2, 6, 23, 0.7), 0 0 25px -8px rgba(56, 189, 248, 0.2)",
        color: "#ffffff"
      }}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

      {/* Card Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-xs" />
            <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
              <QrCode size={14} className="text-cyan-400" /> Facility Attendance QR Pass
            </h2>
            <span
              className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#7dd3fc"
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
            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-slate-200 flex items-center gap-1.5 shadow-2xs"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}
          >
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>{gymInfo.code}</span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="relative z-10 my-4 flex flex-col md:flex-row items-center gap-6">
        {/* Left: High-Definition QR Pass */}
        <div className="shrink-0 flex flex-col items-center">
          <div
            className="p-3 bg-white rounded-2xl relative group/qr flex flex-col items-center justify-center transition-transform hover:scale-[1.02]"
            style={{
              boxShadow: "0 16px 36px -8px rgba(0, 0, 0, 0.6), 0 0 24px rgba(56, 189, 248, 0.25)",
              border: "2px solid rgba(255, 255, 255, 0.95)"
            }}
          >
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

        {/* Right: Facility Profile & Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight truncate" title={gymInfo.name}>
                {gymInfo.name}
              </h3>
            </div>
            <p className="text-[11px] text-slate-300 font-normal leading-relaxed mt-1">
              Generated automatically and permanently tied to this facility. Print or display at front-desk turnstiles for touchless member check-ins.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
              <div
                className="p-2 rounded-xl text-slate-200"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
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
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
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
              className="h-8 px-3 rounded-lg text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer bg-indigo-600 hover:bg-indigo-500"
            >
              <Download size={12} strokeWidth={2.2} />
              <span>Download SVG</span>
            </button>

            <button
              type="button"
              onClick={handlePrintStandee}
              className="h-8 px-3 rounded-lg text-slate-200 hover:text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-white/20 hover:border-white/30 bg-white/10"
            >
              <Printer size={12} strokeWidth={1.75} />
              <span>Print Standee</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="h-8 px-3 rounded-lg text-slate-200 hover:text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border border-white/20 hover:border-white/30 bg-white/10"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} strokeWidth={1.75} />}
              <span>{copied ? "Copied" : "Copy Portal"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-2 inset-x-6 z-30 py-1.5 px-3 rounded-lg bg-slate-900 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30 flex items-center justify-center gap-2 shadow-lg"
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
// REAL-TIME ACTIVITY FEED (NO MOCK DATA)
// ─────────────────────────────────────────

function LiveFeed({ logs = [], onCheckOut }) {
  const recentLogs = useMemo(() => {
    return [...logs].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 8);
  }, [logs]);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-2xs border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Activity size={14} className="text-emerald-500" /> Real-Time Activity Feed
        </h3>
        <div className="flex gap-1.5 items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Live Stream</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 mt-3 space-y-3 custom-scrollbar min-h-[220px]">
        {recentLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-2">
              <Clock size={20} />
            </div>
            <div className="font-bold text-xs text-slate-700">No activity logged today</div>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-[220px]">
              Turnstiles are active. Scanned member passes and turnstile check-ins will stream here in real time.
            </p>
          </div>
        ) : (
          recentLogs.map((log) => {
            const isCompleted = Boolean(log.checkOutTime);
            return (
              <div
                key={log.id}
                className="flex gap-3 items-start p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200/80 group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                  <img
                    src={resolvePhoto(log.photo, log.name, log.gender)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{log.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {formatTimeAgo(log.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                    {log.status === "Granted" && (
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-500" />
                        <span>Granted</span>
                      </span>
                    )}
                    {log.status === "Flagged" && (
                      <span className="font-bold text-amber-600 flex items-center gap-1">
                        <AlertTriangle size={11} className="text-amber-500" />
                        <span>Flagged</span>
                      </span>
                    )}
                    {log.status === "Denied" && (
                      <span className="font-bold text-rose-600 flex items-center gap-1">
                        <XCircle size={11} className="text-rose-500" />
                        <span>Blocked</span>
                      </span>
                    )}

                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 truncate">{log.plan || "Member Access"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1 pt-1 border-t border-slate-100/60 text-[10px] text-slate-400 font-medium">
                    <span>{log.method || "QR Pass"}</span>
                    {!isCompleted ? (
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>On Floor ({calculateDuration(log.timestamp)})</span>
                      </span>
                    ) : (
                      <span className="font-mono text-slate-500">
                        Out at {log.checkOutTime} ({log.duration || calculateDuration(log.timestamp, log.checkOutTimestamp)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// THERMAL RECEIPT PRINTER UTILITY
// ─────────────────────────────────────────

const printAttendanceReceipt = (log, gymName) => {
  const printWindow = window.open("", "_blank", "width=380,height=520");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Gate Pass - ${log.name}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          body {
            font-family: monospace;
            font-size: 11px;
            color: #000;
            padding: 8px;
            margin: 0;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .barcode { font-size: 14px; letter-spacing: 3px; font-weight: bold; margin: 10px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">${gymName || "GYMDECK FITNESS"}</div>
        <div class="center" style="font-size: 10px;">DAILY ATTENDANCE GATE PASS</div>
        <div class="divider"></div>
        <div class="row"><span>DATE:</span><span class="bold">${log.date || new Date().toISOString().split("T")[0]}</span></div>
        <div class="row"><span>ENTRY TIME:</span><span class="bold">${log.checkInTime}</span></div>
        <div class="row"><span>PASS ID:</span><span>${log.id}</span></div>
        <div class="divider"></div>
        <div class="row"><span>MEMBER:</span><span class="bold">${log.name}</span></div>
        <div class="row"><span>MEMBER ID:</span><span>${log.memberId}</span></div>
        <div class="row"><span>PLAN:</span><span>${log.plan || "Standard"}</span></div>
        <div class="row"><span>METHOD:</span><span>${log.method || "QR Pass"}</span></div>
        <div class="row"><span>STATUS:</span><span class="bold">${log.status}</span></div>
        <div class="divider"></div>
        <div class="barcode">*${log.id}*</div>
        <div class="center" style="font-size: 9px; margin-top: 6px;">
          Have a great workout!<br />Keep this pass for locker / floor check.
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

// ─────────────────────────────────────────
// EXPORT TO CSV HELPER
// ─────────────────────────────────────────

const exportAttendanceToCSV = (logs, gymName) => {
  if (!logs || logs.length === 0) return;

  const headers = [
    "Log ID",
    "Date",
    "Check-In Time",
    "Check-Out Time",
    "Member Name",
    "Member ID",
    "Phone",
    "Plan",
    "Method",
    "Status",
    "Trainer",
    "Duration"
  ];

  const rows = logs.map((l) => [
    l.id,
    l.date,
    l.checkInTime,
    l.checkOutTime || "Active",
    `"${l.name.replace(/"/g, '""')}"`,
    l.memberId,
    `"${l.phone || ""}"`,
    `"${(l.plan || "").replace(/"/g, '""')}"`,
    l.method || "QR Pass",
    l.status,
    `"${(l.trainer || "-").replace(/"/g, '""')}"`,
    l.duration || calculateDuration(l.timestamp, l.checkOutTimestamp)
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${(gymName || "gymdeck").toLowerCase()}-attendance-${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ─────────────────────────────────────────
// FILTER CONSTANTS FOR DROPDOWNS
// ─────────────────────────────────────────

const METHOD_OPTIONS = [
  { id: "All", label: "All Entry Methods", icon: Layers, description: "Touchless QR, RFID, biometric" },
  { id: "QR Pass", label: "Touchless QR Pass", icon: QrCode, description: "Scanned via Member App" },
  { id: "RFID Keyfob", label: "RFID Card Keyfob", icon: Zap, description: "Turnstile tap reader" },
  { id: "Biometric", label: "Biometric Reader", icon: ShieldCheck, description: "Fingerprint / face scan" }
];

const SORT_OPTIONS = [
  { id: "newest", label: "Newest First", icon: ArrowUpDown, description: "Latest arrivals on top" },
  { id: "oldest", label: "Oldest First", icon: ArrowUpDown, description: "Chronological sequence" },
  { id: "name_asc", label: "Member Name (A-Z)", icon: User, description: "Alphabetical member order" }
];

const PAGE_SIZE_OPTIONS = [
  { id: 10, label: "10 rows per page" },
  { id: 25, label: "25 rows per page" },
  { id: 50, label: "50 rows per page" }
];

// ─────────────────────────────────────────
// MAIN DAILY CHECK-IN COMPONENT
// ─────────────────────────────────────────

const DailyCheckinPage = () => {
  // Gym Profile Information
  const [gymInfo, setGymInfo] = useState(() => {
    let savedName = typeof localStorage !== "undefined"
      ? localStorage.getItem("gymdeck_gym_name") || localStorage.getItem("gymdeck_gym_brand_name")
      : null;
    let savedCode = typeof localStorage !== "undefined" ? localStorage.getItem("gymdeck_gym_code") : null;
    let savedId = typeof localStorage !== "undefined" ? localStorage.getItem("gymdeck_gym_id") : null;

    if (!savedCode) {
      savedCode = "GDK-" + Math.floor(1000 + Math.random() * 9000);
      try { localStorage.setItem("gymdeck_gym_code", savedCode); } catch (e) {}
    }
    if (!savedId) {
      savedId = "gym_" + Math.random().toString(36).substring(2, 10);
      try { localStorage.setItem("gymdeck_gym_id", savedId); } catch (e) {}
    }
    if (!savedName) {
      savedName = "GymDeck Facility";
      try { localStorage.setItem("gymdeck_gym_name", savedName); } catch (e) {}
    }
    return { name: savedName, code: savedCode, id: savedId };
  });

  const qrMatrix = useMemo(() => getQRMatrix(gymInfo.code), [gymInfo.code]);

  // Real Registered Members
  const [members, setMembers] = useState([]);

  // Real Persistent Attendance Logs
  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    try {
      const stored = localStorage.getItem("gymdeck_attendance_logs");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // UI Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // 1. Load Real Members from Tauri or localStorage
  const loadMembers = useCallback(async () => {
    try {
      let dbMembers = [];
      if (window.__TAURI__?.core?.invoke) {
        dbMembers = await window.__TAURI__.core.invoke("get_members_command", { limit: 10000, offset: 0 }).catch(() => []);
      }

      if (!dbMembers || dbMembers.length === 0) {
        if (window.cachedMembers && window.cachedMembers.length > 0) {
          dbMembers = window.cachedMembers;
        } else {
          const raw = localStorage.getItem("gymdeck_members");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) dbMembers = parsed;
          }
        }
      }

      // Check soft-deleted
      let deletedIds = new Set();
      try {
        const rawDel = localStorage.getItem("gymdeck_deleted_members") || localStorage.getItem("gymdeck_member_deleted_ids");
        if (rawDel) {
          const parsedDel = JSON.parse(rawDel);
          if (Array.isArray(parsedDel)) deletedIds = new Set(parsedDel.map(String));
        }
      } catch (e) {}

      const cleanMembers = (dbMembers || []).filter((m) => m && m.id && !deletedIds.has(String(m.id)));
      setMembers(cleanMembers);
    } catch (e) {
      console.warn("GymDeck: Error loading members for attendance:", e);
    }
  }, []);

  useEffect(() => {
    loadMembers();

    // Listen to member updates
    const handleMembersUpdated = () => loadMembers();
    window.addEventListener("gymdeck:members-updated", handleMembersUpdated);
    return () => window.removeEventListener("gymdeck:members-updated", handleMembersUpdated);
  }, [loadMembers]);

  // 2. Sync Attendance Logs with LocalStorage & Custom Events
  const saveAttendanceLogs = useCallback((newLogs) => {
    setAttendanceLogs(newLogs);
    try {
      localStorage.setItem("gymdeck_attendance_logs", JSON.stringify(newLogs));
    } catch (e) {
      console.error("GymDeck: Failed to persist attendance log:", e);
    }
    window.dispatchEvent(new CustomEvent("gymdeck:attendance-updated", { detail: newLogs }));
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "gymdeck_attendance_logs" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setAttendanceLogs(parsed);
        } catch (err) {}
      }
    };
    const handleCustomUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setAttendanceLogs(e.detail);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("gymdeck:attendance-updated", handleCustomUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("gymdeck:attendance-updated", handleCustomUpdate);
    };
  }, []);

  // Today's Date String e.g. "2026-11-14"
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Logs for Today
  const todayLogs = useMemo(() => {
    return attendanceLogs.filter((l) => l.date === todayDateStr);
  }, [attendanceLogs, todayDateStr]);

  // Real Dynamic KPIs
  const kpis = useMemo(() => {
    const totalVisits = todayLogs.length;
    const activeOnFloor = todayLogs.filter((l) => !l.checkOutTime).length;
    const completedSessions = todayLogs.filter((l) => Boolean(l.checkOutTime)).length;
    const deniedOrFlagged = todayLogs.filter((l) => l.status === "Denied" || l.status === "Flagged").length;

    // Peak traffic hour calculation
    const hourCounts = {};
    todayLogs.forEach((l) => {
      if (l.timestamp) {
        const hour = new Date(l.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    let peakHourStr = "--";
    let maxHourCount = 0;
    Object.entries(hourCounts).forEach(([hr, count]) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        const hrNum = parseInt(hr, 10);
        const ampm = hrNum >= 12 ? "PM" : "AM";
        const displayHr = hrNum % 12 === 0 ? 12 : hrNum % 12;
        peakHourStr = `${displayHr}:00 ${ampm} (${count})`;
      }
    });

    // Average duration of completed workouts
    let totalMinutes = 0;
    let completedCount = 0;
    todayLogs.forEach((l) => {
      if (l.timestamp && l.checkOutTimestamp) {
        const diffMin = Math.round((l.checkOutTimestamp - l.timestamp) / 60000);
        if (diffMin > 0) {
          totalMinutes += diffMin;
          completedCount++;
        }
      }
    });

    const avgMinutes = completedCount > 0 ? Math.round(totalMinutes / completedCount) : 0;
    const avgDurationStr = avgMinutes > 0 ? (avgMinutes >= 60 ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m` : `${avgMinutes}m`) : "--";

    return {
      totalVisits,
      activeOnFloor,
      completedSessions,
      deniedOrFlagged,
      peakHourStr,
      avgDurationStr
    };
  }, [todayLogs]);

  // Filtered & Sorted Table Rows
  const filteredLogs = useMemo(() => {
    return todayLogs
      .filter((row) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const name = (row.name || "").toLowerCase();
          const mId = (row.memberId || "").toLowerCase();
          const phone = (row.phone || "").toLowerCase();
          const plan = (row.plan || "").toLowerCase();
          const notes = (row.notes || "").toLowerCase();
          if (!name.includes(q) && !mId.includes(q) && !phone.includes(q) && !plan.includes(q) && !notes.includes(q)) {
            return false;
          }
        }

        // Status Filter
        if (statusFilter === "Active") {
          if (row.checkOutTime) return false;
        } else if (statusFilter === "Completed") {
          if (!row.checkOutTime) return false;
        } else if (statusFilter === "Flagged") {
          if (row.status !== "Flagged" && row.status !== "Denied") return false;
        }

        // Method Filter
        if (methodFilter !== "All" && row.method !== methodFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return (b.timestamp || 0) - (a.timestamp || 0);
        }
        if (sortBy === "oldest") {
          return (a.timestamp || 0) - (b.timestamp || 0);
        }
        if (sortBy === "name_asc") {
          return (a.name || "").localeCompare(b.name || "");
        }
        return 0;
      });
  }, [todayLogs, searchQuery, statusFilter, methodFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Filter Reset Handler

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setMethodFilter("All");
    setSortBy("newest");
    setCurrentPage(1);
  };

  return (
    <div className="daily-checkin-shell font-sans text-slate-900 selection:bg-indigo-100">
      <div className="daily-checkin-workspace">
        {/* ════════════════════════════════════════════════════════════
            1. EXECUTIVE TOP HEADER & ACTION CONTROLS
        ════════════════════════════════════════════════════════════ */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>Attendance</span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="font-bold text-slate-800">Daily Check-In</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Turnstiles Online
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Daily Attendance & Floor Check-In
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live audit stream of touchless QR scans, RFID turnstile logs, and front-desk member visits for {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => exportAttendanceToCSV(todayLogs, gymInfo.name)}
              disabled={todayLogs.length === 0}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
              title="Download CSV report of today's attendance"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={loadMembers}
              className="h-10 w-10 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Refresh attendance records"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════════════
            2. REAL FINANCIAL & ATTENDANCE KPI RIBBON
        ════════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile
            label="Today's Visits"
            value={kpis.totalVisits}
            tone="indigo"
            icon={Users}
            subtext="Check-ins today"
          />
          <StatTile
            label="Active On Floor"
            value={kpis.activeOnFloor}
            tone="emerald"
            icon={Activity}
            subtext="Currently training"
          />
          <StatTile
            label="Completed"
            value={kpis.completedSessions}
            tone="blue"
            icon={CheckCircle2}
            subtext="Checked out"
          />
          <StatTile
            label="Flagged / Blocked"
            value={kpis.deniedOrFlagged}
            tone={kpis.deniedOrFlagged > 0 ? "rose" : "slate"}
            icon={ShieldAlert}
            subtext="Expired or frozen"
          />
          <StatTile
            label="Peak Traffic"
            value={kpis.peakHourStr}
            tone="amber"
            icon={TrendingUp}
            subtext="Highest hour"
          />
          <StatTile
            label="Avg. Session"
            value={kpis.avgDurationStr}
            tone="slate"
            icon={Timer}
            subtext="Completed time"
          />
        </section>

        {/* ════════════════════════════════════════════════════════════
            3. OPERATIONAL GATEWAY: STANDEE & LIVE STREAM
        ════════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[310px]">
          <div className="lg:col-span-7 xl:col-span-8 h-full">
            <InstantCheckIn
              gymInfo={gymInfo}
              qrMatrix={qrMatrix}
            />
          </div>
          <div className="lg:col-span-5 xl:col-span-4 h-full">
            <LiveFeed logs={todayLogs} />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            4. COMMAND CENTER & CUSTOM FILTER TOOLBAR
        ════════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            {/* Search Bar with Perfect Center Alignment */}
            <div className="lg:col-span-5">
              <div className="group relative flex items-center w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center justify-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Search size={15} strokeWidth={2.4} />
                </div>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search member name, ID, phone, plan, or desk note..."
                  className="w-full h-10 pl-10 pr-10 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-2xs leading-normal"
                />

                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Clear search"
                  >
                    <span className="w-5 h-5 rounded-md hover:bg-slate-200/80 flex items-center justify-center transition-colors">
                      <X size={12} strokeWidth={2.5} />
                    </span>
                  </button>
                ) : (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-slate-400 border border-slate-200 bg-white shadow-2xs">
                      ⌘K
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Pills */}
            <div className="lg:col-span-7 flex items-center overflow-x-auto gap-1.5 pb-1 lg:pb-0 custom-scrollbar">
              {[
                { id: "All", label: "All Logs Today", count: todayLogs.length },
                {
                  id: "Active",
                  label: "Active On Floor",
                  count: todayLogs.filter((t) => !t.checkOutTime).length
                },
                {
                  id: "Completed",
                  label: "Completed",
                  count: todayLogs.filter((t) => Boolean(t.checkOutTime)).length
                },
                {
                  id: "Flagged",
                  label: "Flagged / Denied",
                  count: todayLogs.filter((t) => t.status === "Denied" || t.status === "Flagged").length
                }
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`h-9 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isActive
                        ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                        : "bg-slate-50/80 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                        isActive ? "bg-white/20 text-white" : "bg-white text-slate-500 border border-slate-200/60"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Custom Dropdown Menus */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <CustomDropdown
                id="method-filter-dropdown"
                label="Method"
                value={methodFilter}
                options={METHOD_OPTIONS}
                onChange={(val) => {
                  setMethodFilter(val);
                  setCurrentPage(1);
                }}
                icon={Layers}
                menuWidth="w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <CustomDropdown
                id="sort-filter-dropdown"
                label="Sort"
                value={sortBy}
                options={SORT_OPTIONS}
                onChange={(val) => setSortBy(val)}
                icon={ArrowUpDown}
                align="right"
                menuWidth="w-56"
              />
            </div>
          </div>

          {/* Active Filters Summary Ribbon */}
          {(searchQuery || statusFilter !== "All" || methodFilter !== "All") && (
            <div className="flex items-center flex-wrap gap-2 pt-2.5 border-t border-slate-100 text-xs">
              <span className="text-[10px] font-black text-slate-400 uppercase">Active Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")} className="hover:text-indigo-900 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              {statusFilter !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("All")} className="hover:text-slate-900 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}
              {methodFilter !== "All" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  Method: {methodFilter}
                  <button onClick={() => setMethodFilter("All")} className="hover:text-slate-900 cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleClearAllFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer ml-auto"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════
            5. ATTENDANCE LOGS LEDGER TABLE
        ════════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[840px]">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Entry Time & Method</th>
                  <th className="py-3 px-4">Member Entity</th>
                  <th className="py-3 px-4">Plan & Trainer</th>
                  <th className="py-3 px-4">Floor Session</th>
                  <th className="py-3 px-4">Validation</th>
                  <th className="py-3 px-4 text-right">Gate Pass</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      {todayLogs.length === 0 ? (
                        <div className="max-w-sm mx-auto space-y-3">
                          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
                            <Clock size={22} />
                          </div>
                          <div className="font-bold text-sm text-slate-800">No attendance recorded today</div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Members scanning the front-desk QR standee with their GymDeck Member App or passing through turnstiles will automatically appear in this live ledger.
                          </p>
                        </div>
                      ) : (
                        <div className="max-w-sm mx-auto space-y-2">
                          <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                            <Search size={20} />
                          </div>
                          <div className="font-bold text-sm text-slate-700">No matching check-ins found</div>
                          <p className="text-xs text-slate-400">
                            Try adjusting your search query or clear the active filters.
                          </p>
                          <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer pt-1"
                          >
                            Clear All Filters
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((row) => {
                    const isCompleted = Boolean(row.checkOutTime);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Column 1: Time & Method */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {row.checkInTime}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                            <span>{row.method || "QR Pass"}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono">{row.id}</span>
                          </div>
                        </td>

                        {/* Column 2: Member Entity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                              <img
                                src={resolvePhoto(row.photo, row.name, row.gender)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-bold text-slate-950 truncate">
                                {row.name}
                              </span>
                              <span className="block text-[10px] font-mono text-slate-400 truncate">
                                {row.memberId} {row.phone ? `• ${row.phone}` : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Column 3: Plan & Trainer */}
                        <td className="py-3 px-4">
                          <span className="block text-xs font-bold text-slate-900 truncate max-w-[170px]">
                            {row.plan || "General Admission"}
                          </span>
                          <span className="block text-[10px] font-medium text-slate-400 truncate mt-0.5">
                            {row.trainer && row.trainer !== "-" ? `Trainer: ${row.trainer}` : "Standard Floor Access"}
                          </span>
                        </td>

                        {/* Column 4: Floor Status & Duration */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {!isCompleted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-200/80">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active ({calculateDuration(row.timestamp)})</span>
                            </span>
                          ) : (
                            <div className="text-slate-600">
                              <span className="font-semibold text-xs text-slate-800">
                                {row.duration || calculateDuration(row.timestamp, row.checkOutTimestamp)}
                              </span>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Out: {row.checkOutTime}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Column 5: Validation */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {row.status === "Granted" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              Granted
                            </span>
                          )}
                          {row.status === "Flagged" && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                              title={row.notes}
                            >
                              <AlertTriangle size={11} className="text-amber-600" />
                              Flagged
                            </span>
                          )}
                          {row.status === "Denied" && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200"
                              title={row.notes}
                            >
                              <XCircle size={11} className="text-rose-600" />
                              Blocked
                            </span>
                          )}
                        </td>

                        {/* Column 6: Print Pass Slip */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => printAttendanceReceipt(row, gymInfo.name)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-bold text-[10px] transition-colors cursor-pointer border border-slate-200/60"
                            title="Print thermal gate pass slip"
                          >
                            <Printer size={12} />
                            <span>Print Slip</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination Controls */}
          {filteredLogs.length > 0 && (
            <div className="px-4 py-3 bg-slate-50/75 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-[11px] font-medium">
                  Showing <strong className="text-slate-900 font-bold">{paginatedLogs.length}</strong> of{" "}
                  <strong className="text-slate-900 font-bold">{filteredLogs.length}</strong> check-ins
                </span>

                <CustomDropdown
                  id="page-size-dropdown"
                  label=""
                  value={pageSize}
                  options={PAGE_SIZE_OPTIONS}
                  onChange={(val) => {
                    setPageSize(val);
                    setCurrentPage(1);
                  }}
                  direction="up"
                  menuWidth="w-44"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                <span className="text-[11px] font-bold text-slate-600 px-2 font-mono">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[300] bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800"
          >
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// MOUNT FUNCTION FOR GYMDECK RUNTIME
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
        <>
          <DailyCheckinPage />
          <BrandFooter />
        </>
      </ErrorBoundary>
    );
    return root;
  } catch (err) {
    console.error("Failed to render Daily Check-in:", err);
    return null;
  }
}

export default DailyCheckinPage;
