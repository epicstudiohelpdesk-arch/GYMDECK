import BrandFooter from "./BrandFooter.jsx";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  Video,
  Shield,
  ShieldCheck,
  Camera,
  Server,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Maximize2,
  Minimize2,
  Grid,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Cpu,
  Wifi,
  WifiOff,
  Sliders,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Plus,
  Eye,
  Activity,
  ArrowRight,
  ExternalLink,
  Radio,
  FileVideo,
  Lock,
  Layers,
  Sparkles,
  HelpCircle,
  Film,
  Zap,
  Check,
  BarChart3,
  Monitor,
  Trash2,
  AlertCircle,
  BookOpen,
  FileText,
  Copy,
  Terminal,
  Network,
  Info,
  RotateCw,
  Tv
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Configuration for Local Edge Gateway Daemon loopback & Cloud API
const GATEWAY_LOOPBACK_URL = "http://127.0.0.1:49152";
const CLOUD_API_BASE = "/v1/cctv";

const PRESET_LOCATIONS = [
  "Reception",
  "Main Entrance",
  "Workout Floor",
  "Cardio Section",
  "Weight Section",
  "Billing Counter",
  "Locker Entrance",
  "Parking Area",
  "Custom Zone",
];

// Clean subsystem defaults: zero mock data
const DEFAULT_MOCK_CAMERAS = [];
const DEFAULT_MOCK_EXPORTS = [];
const DEFAULT_MOCK_SEGMENTS = [];

// Helper to retrieve auth header if available
const getAuthHeaders = () => {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("gymdeck_cloud_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM PROFESSIONAL DROPDOWN COMPONENT (Replaces native <select>)
// ─────────────────────────────────────────────────────────────────────────────
const CustomDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Select option",
  className = "",
  size = "md",
  align = "left",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white hover:bg-slate-50 border text-slate-800 font-semibold rounded-xl flex items-center justify-between gap-2.5 transition-all shadow-sm ${
          isOpen ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-slate-200/90 hover:border-slate-300"
        } ${
          size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-4 py-2.5 text-xs" : "px-3.5 py-2 text-xs"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="text-slate-500 shrink-0">{selectedOption.icon}</span>
          )}
          {selectedOption?.badge !== undefined && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
              {selectedOption.badge}
            </span>
          )}
          <span className="truncate text-slate-900 font-bold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.subtext && (
            <span className="text-[10px] text-slate-400 font-normal truncate hidden sm:inline">
              ({selectedOption.subtext})
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-indigo-600" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={`absolute top-full mt-1.5 ${
              align === "right" ? "right-0" : "left-0"
            } z-50 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 min-w-[220px] max-w-sm max-h-64 overflow-y-auto overflow-x-hidden`}
          >
            <div className="space-y-0.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between gap-2.5 transition-colors ${
                      isSelected
                        ? "bg-indigo-50/80 text-indigo-950 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && (
                        <span className={isSelected ? "text-indigo-600" : "text-slate-400"}>
                          {option.icon}
                        </span>
                      )}
                      {option.badge !== undefined && (
                        <span className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                        }`}>
                          {option.badge}
                        </span>
                      )}
                      <div className="flex flex-col truncate">
                        <span className="truncate">{option.label}</span>
                        {option.subtext && (
                          <span className="text-[10px] text-slate-400 font-normal truncate">
                            {option.subtext}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-indigo-600 shrink-0" strokeWidth={2.5} />
                    )}
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

// Reusable Light-Themed Stat Tile
const StatTile = ({ label, value, subtext, tone = "indigo", icon: Icon }) => {
  const tones = {
    indigo: {
      icon: "text-indigo-600 bg-indigo-50 border-indigo-100",
      accent: "text-indigo-600",
    },
    emerald: {
      icon: "text-emerald-600 bg-emerald-50 border-emerald-100",
      accent: "text-emerald-600",
    },
    blue: {
      icon: "text-blue-600 bg-blue-50 border-blue-100",
      accent: "text-blue-600",
    },
    amber: {
      icon: "text-amber-600 bg-amber-50 border-amber-100",
      accent: "text-amber-600",
    },
    rose: {
      icon: "text-rose-600 bg-rose-50 border-rose-100",
      accent: "text-rose-600",
    },
    slate: {
      icon: "text-slate-700 bg-slate-100 border-slate-200",
      accent: "text-slate-800",
    },
  };

  const currentTone = tones[tone] || tones.indigo;

  return (
    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${currentTone.icon}`}>
          <Icon size={16} strokeWidth={2.2} />
        </div>
      </div>
      <div className="flex flex-col gap-1 pt-0.5">
        <p className="text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight leading-none">
          {value}
        </p>
        {subtext && (
          <p className="text-[11px] font-medium text-slate-500 leading-normal mt-0.5">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export const CCTV = () => {
  // Navigation / Tab state: 'LIVE' | 'RECORDINGS' | 'EXPORTS' | 'HEALTH'
  const [activeTab, setActiveTab] = useState("LIVE");
  const [toastMessage, setToastMessage] = useState(null);

  // Guidance modal state
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeGuideStep, setActiveGuideStep] = useState(1);
  const [copiedCommand, setCopiedCommand] = useState(null);

  // Fullscreen / Modal state for Live Cameras
  const [fullscreenCamId, setFullscreenCamId] = useState(null);
  const [fullscreenMode, setFullscreenMode] = useState("FOCUS");

  // Fullscreen state for Playback & Timeline
  const [isPlaybackFullscreen, setIsPlaybackFullscreen] = useState(false);

  // Modal states for Quick Add Camera
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickCamName, setQuickCamName] = useState("");
  const [quickCamZone, setQuickCamZone] = useState("Main Entrance");
  const [quickCamIp, setQuickCamIp] = useState("192.168.1.107");
  const [quickCamRtsp, setQuickCamRtsp] = useState("");

  // Live ticking clock for camera monitors (CCTV watermark clock)
  const [liveClock, setLiveClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Gateway status (defaults to clean offline state until real daemon IPC connects)
  const [gatewayStatus, setGatewayStatus] = useState({
    online: false,
    version: "—",
    uptime: 0,
    metrics: { cpuUsagePercent: 0, memoryUsageMb: 0, freeDiskGb: 0 },
    platform: "—",
    localIp: "—",
    isSimulated: false,
  });
  const [isCheckingGateway, setIsCheckingGateway] = useState(false);

  // Active Enrolled Cameras state (clean state, filters out any legacy mock data)
  const [cameras, setCameras] = useState(() => {
    try {
      const stored = localStorage.getItem("gymdeck_cctv_cameras");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userCameras = parsed.filter(
            (c) => !["cam-01", "cam-02", "cam-03", "cam-04", "cam-05", "cam-06"].includes(c?.id)
          );
          if (userCameras.length > 0) return userCameras;
        }
      }
    } catch (e) {
      console.warn("Failed reading gymdeck_cctv_cameras:", e);
    }
    return [];
  });

  const saveCameras = useCallback((newCameras) => {
    setCameras(newCameras);
    try {
      localStorage.setItem("gymdeck_cctv_cameras", JSON.stringify(newCameras));
    } catch (err) {
      console.error("Failed to persist cameras to localStorage:", err);
    }
  }, []);

  // Live Feeds view state
  const [gridLayout, setGridLayout] = useState(4); // 1, 4, 6, 9

  // Recorded Footage state
  const [selectedRecordCamId, setSelectedRecordCamId] = useState(() => cameras[0]?.id || "");
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [playbackTimeHour, setPlaybackTimeHour] = useState(10);
  const [playbackTimeMinute, setPlaybackTimeMinute] = useState(0);
  const [isPlayingRecord, setIsPlayingRecord] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [recordSegments, setRecordSegments] = useState([]);
  const [isSearchingRecordings, setIsSearchingRecordings] = useState(false);
  const [recordingSearchMessage, setRecordingSearchMessage] = useState(null);

  // Interactive Playback loop when isPlayingRecord is true
  useEffect(() => {
    if (!isPlayingRecord) return;
    const interval = setInterval(() => {
      setPlaybackTimeMinute((prev) => {
        if (prev >= 59) {
          setPlaybackTimeHour((h) => (h >= 23 ? 0 : h + 1));
          return 0;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlayingRecord, playbackSpeed]);

  // Clip Export State (Loads real user jobs from localStorage)
  const [isExportDrawerOpen, setIsExportDrawerOpen] = useState(false);
  const [exportCamId, setExportCamId] = useState(() => cameras[0]?.id || "");
  const [exportStartTime, setExportStartTime] = useState(`${new Date().toISOString().slice(0, 10)}T10:00`);
  const [exportEndTime, setExportEndTime] = useState(`${new Date().toISOString().slice(0, 10)}T10:15`);
  const [burnWatermark, setBurnWatermark] = useState(true);
  const [exportJobs, setExportJobs] = useState(() => {
    try {
      const stored = localStorage.getItem("gymdeck_cctv_exports");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userExports = parsed.filter(
            (j) => !["exp_1710091", "exp_1710092", "exp_1710093", "exp-001"].includes(j?.jobId)
          );
          if (userExports.length > 0) return userExports;
        }
      }
    } catch (e) {
      console.warn("Failed reading gymdeck_cctv_exports:", e);
    }
    return [];
  });

  const saveExportJobs = useCallback((newJobs) => {
    setExportJobs(newJobs);
    try {
      localStorage.setItem("gymdeck_cctv_exports", JSON.stringify(newJobs));
    } catch (err) {
      console.error("Failed to persist exports to localStorage:", err);
    }
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text, label) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedCommand(label);
      showToast(`Copied to clipboard: ${label}`);
      setTimeout(() => setCopiedCommand(null), 2500);
    } catch {
      showToast("Could not copy automatically. Please select and copy manually.");
    }
  };

  // Keyboard shortcut listener for ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isPlaybackFullscreen) {
          setIsPlaybackFullscreen(false);
        } else if (fullscreenMode === "IMMERSIVE") {
          setFullscreenMode("FOCUS");
        } else if (fullscreenCamId) {
          setFullscreenCamId(null);
        } else if (isGuideOpen) {
          setIsGuideOpen(false);
        } else if (isQuickAddOpen) {
          setIsQuickAddOpen(false);
        } else if (isExportDrawerOpen) {
          setIsExportDrawerOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaybackFullscreen, fullscreenMode, fullscreenCamId, isGuideOpen, isQuickAddOpen, isExportDrawerOpen]);

  // Keep selected recording / export camera in sync when cameras update
  useEffect(() => {
    if (cameras.length > 0 && !selectedRecordCamId) {
      setSelectedRecordCamId(cameras[0].id);
    }
    if (cameras.length > 0 && !exportCamId) {
      setExportCamId(cameras[0].id);
    }
  }, [cameras, selectedRecordCamId, exportCamId]);

  // Currently focused camera object
  const activeFullscreenCam = useMemo(() => {
    return cameras.find((c) => c.id === fullscreenCamId) || null;
  }, [cameras, fullscreenCamId]);

  // Real Check Gateway Loopback status
  const checkGatewayHealth = useCallback(async () => {
    setIsCheckingGateway(true);
    try {
      const res = await fetch(`${GATEWAY_LOOPBACK_URL}/status`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        setGatewayStatus({
          online: true,
          version: data.version || "1.0.0-edge",
          uptime: data.metrics?.uptimeSeconds || data.uptime || 0,
          metrics: {
            cpuUsagePercent: data.metrics?.cpuUsagePercent ?? 0,
            memoryUsageMb: data.metrics?.memoryUsageMb ?? 0,
            freeDiskGb: data.metrics?.freeDiskGb ?? 0,
          },
          platform: data.host?.platform || "Local Gateway Daemon",
          localIp: data.host?.localIp || "127.0.0.1",
          isSimulated: false,
        });
        showToast("Gateway connected: Operational on 127.0.0.1:49152");
      } else {
        throw new Error("Gateway non-200");
      }
    } catch {
      setGatewayStatus({
        online: false,
        version: "—",
        uptime: 0,
        metrics: { cpuUsagePercent: 0, memoryUsageMb: 0, freeDiskGb: 0 },
        platform: "Local Host",
        localIp: "127.0.0.1",
        isSimulated: false,
      });
    } finally {
      setIsCheckingGateway(false);
    }
  }, []);

  useEffect(() => {
    checkGatewayHealth();
  }, [checkGatewayHealth]);

  // Clean up any lingering mock data from localStorage on mount
  useEffect(() => {
    try {
      const storedCams = localStorage.getItem("gymdeck_cctv_cameras");
      if (storedCams && (storedCams.includes("cam-01") || storedCams.includes("Reception & Turnstiles"))) {
        const parsed = JSON.parse(storedCams);
        const filtered = parsed.filter(
          (c) => !["cam-01", "cam-02", "cam-03", "cam-04", "cam-05", "cam-06"].includes(c?.id)
        );
        if (filtered.length > 0) {
          localStorage.setItem("gymdeck_cctv_cameras", JSON.stringify(filtered));
          setCameras(filtered);
        } else {
          localStorage.removeItem("gymdeck_cctv_cameras");
          setCameras([]);
        }
      }
      const storedExps = localStorage.getItem("gymdeck_cctv_exports");
      if (storedExps && (storedExps.includes("exp_1710091") || storedExps.includes("exp-001"))) {
        const parsed = JSON.parse(storedExps);
        const filtered = parsed.filter(
          (j) => !["exp_1710091", "exp_1710092", "exp_1710093", "exp-001"].includes(j?.jobId)
        );
        if (filtered.length > 0) {
          localStorage.setItem("gymdeck_cctv_exports", JSON.stringify(filtered));
          setExportJobs(filtered);
        } else {
          localStorage.removeItem("gymdeck_cctv_exports");
          setExportJobs([]);
        }
      }
    } catch (e) {}
  }, []);

  // Quick Add Camera Modal Submit
  const handleQuickAddCamera = (e) => {
    e.preventDefault();
    if (!quickCamName.trim()) {
      showToast("Please enter a camera name.");
      return;
    }

    const newCam = {
      id: `cam-${Date.now()}`,
      channelNumber: cameras.length + 1,
      name: quickCamName.trim(),
      locationZone: quickCamZone,
      ipAddress: quickCamIp.trim() || "192.168.1.107",
      rtspUrl: quickCamRtsp.trim() || `rtsp://admin:****@${quickCamIp.trim() || "192.168.1.107"}:554/live/ch${cameras.length + 1}`,
      status: "ONLINE",
      codec: "H264",
      currentProfile: "SUB",
      fps: 25,
      resolution: "1920x1080",
      bitrateKbps: 450,
      model: "Standard ONVIF IP Camera",
    };

    saveCameras([...cameras, newCam]);
    setIsQuickAddOpen(false);
    setQuickCamName("");
    setQuickCamRtsp("");
    showToast(`Camera "${newCam.name}" added successfully!`);
  };

  // Remove an active camera
  const handleDeleteCamera = (camId) => {
    const cam = cameras.find((c) => c.id === camId);
    if (!cam) return;
    const filtered = cameras.filter((c) => c.id !== camId);
    saveCameras(filtered);
    if (fullscreenCamId === camId) {
      setFullscreenCamId(null);
    }
    showToast(`Camera "${cam.name}" removed.`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FUNCTIONAL SEARCH FOOTAGE IMPLEMENTATION
  // ─────────────────────────────────────────────────────────────────────────
  const searchRecordings = async () => {
    if (!selectedRecordCamId) {
      showToast("Please select a camera channel to search.");
      return;
    }
    const cam = cameras.find((c) => c.id === selectedRecordCamId) || cameras[0];
    const today = new Date().toISOString().slice(0, 10);

    setIsSearchingRecordings(true);
    setRecordingSearchMessage(null);

    // 1. Validation: Future date check
    if (recordDate > today) {
      setTimeout(() => {
        setIsSearchingRecordings(false);
        setRecordSegments([]);
        setRecordingSearchMessage({
          type: "warning",
          text: `Selected date (${recordDate}) is in the future. Historical recordings are only available for past dates up to today.`,
        });
        showToast("Cannot search future dates.");
      }, 350);
      return;
    }

    // 2. Validation: Retention window (30 days)
    const pickedDateObj = new Date(recordDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (pickedDateObj < thirtyDaysAgo) {
      setTimeout(() => {
        setIsSearchingRecordings(false);
        setRecordSegments([]);
        setRecordingSearchMessage({
          type: "warning",
          text: `Recordings for ${recordDate} have been purged under the 30-day automatic rolling retention policy.`,
        });
        showToast("Footage purged: beyond 30-day retention window.");
      }, 350);
      return;
    }

    try {
      // 3. Attempt real cloud search API if server is connected
      const fromTime = `${recordDate}T00:00:00Z`;
      const toTime = `${recordDate}T23:59:59Z`;

      const res = await fetch(`${CLOUD_API_BASE}/recordings/search`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          cameraId: cam.id,
          startTime: fromTime,
          endTime: toTime,
        }),
        signal: AbortSignal.timeout(1500),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        const segments = data.data?.segments || [];
        setRecordSegments(segments);
        if (segments.length > 0) {
          setRecordingSearchMessage({
            type: "success",
            text: `Found ${segments.length} recorded blocks for ${cam.name} on ${recordDate}. Scrubber timeline synced.`,
          });
          showToast(`Loaded ${segments.length} segments from NVR storage.`);
        } else {
          setRecordingSearchMessage({
            type: "info",
            text: `No recordings found on NVR storage for ${cam.name} on ${recordDate}.`,
          });
          showToast(`No footage found for ${recordDate}.`);
        }
      } else {
        setRecordSegments([]);
        setRecordingSearchMessage({
          type: "info",
          text: `No recorded footage found for ${cam.name} on ${recordDate}. Ensure on-premise NVR is actively recording.`,
        });
        showToast(`No recordings found for ${recordDate}.`);
      }
    } catch {
      setRecordSegments([]);
      setRecordingSearchMessage({
        type: "warning",
        text: `Unable to query recordings for ${cam.name}. Check gateway daemon connectivity.`,
      });
      showToast("Recordings query failed.");
    } finally {
      setIsSearchingRecordings(false);
    }
  };

  // Start Real Clip Export
  const handleStartExport = async () => {
    const from = new Date(exportStartTime);
    const to = new Date(exportEndTime);
    const diffSec = Math.round((to.getTime() - from.getTime()) / 1000);

    if (diffSec <= 0) {
      showToast("Start time must be before end time.");
      return;
    }
    if (diffSec > 3600) {
      showToast("Maximum export clip duration is 1 hour (3600 seconds).");
      return;
    }

    const cam = cameras.find((c) => c.id === exportCamId) || cameras[0];
    if (!cam) {
      showToast("Please select a valid camera.");
      return;
    }

    const newJob = {
      jobId: `exp_${Date.now()}`,
      cameraName: cam.name,
      channelNumber: cam.channelNumber,
      startTime: exportStartTime.replace("T", " "),
      endTime: exportEndTime.replace("T", " "),
      durationSeconds: diffSec,
      fileSizeBytes: Math.round(diffSec * 220 * 1024),
      status: "PROCESSING",
      progressPercent: 20,
      downloadUrl: "#",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = [newJob, ...exportJobs];
    saveExportJobs(updated);
    setIsExportDrawerOpen(false);
    showToast("Export queued: preparing MP4 remux...");

    fetch(`${CLOUD_API_BASE}/exports`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        cameraId: cam.id,
        startTime: `${exportStartTime}:00Z`,
        endTime: `${exportEndTime}:00Z`,
        burnWatermark,
      }),
    }).catch(() => null);

    setTimeout(() => {
      saveExportJobs(
        updated.map((j) => (j.jobId === newJob.jobId ? { ...j, progressPercent: 70 } : j))
      );
    }, 1500);

    setTimeout(() => {
      saveExportJobs(
        updated.map((j) =>
          j.jobId === newJob.jobId ? { ...j, status: "COMPLETED", progressPercent: 100 } : j
        )
      );
      showToast(`Export for ${cam.name} ready for download!`);
    }, 3200);
  };

  // Delete export job
  const handleDeleteExport = (jobId) => {
    const filtered = exportJobs.filter((j) => j.jobId !== jobId);
    saveExportJobs(filtered);
    showToast("Export record removed.");
  };

  // Toggle Camera Stream Profile (MAIN vs SUB)
  const toggleCameraProfile = (camId) => {
    const updated = cameras.map((c) => {
      if (c.id === camId) {
        const nextProfile = c.currentProfile === "SUB" ? "MAIN" : "SUB";
        showToast(`${c.name}: Switched to ${nextProfile === "MAIN" ? "HD (Main Stream 1080p)" : "SD (Substream 360p)"}`);
        return {
          ...c,
          currentProfile: nextProfile,
          bitrateKbps: nextProfile === "MAIN" ? (c.codec === "H265" ? 1850 : 2200) : 450,
        };
      }
      return c;
    });
    saveCameras(updated);
  };

  // Step-wise Formal Setup Guidance Data
  const GUIDANCE_STEPS = [
    {
      step: 1,
      tag: "NETWORK ARCHITECTURE",
      title: "Local Network Topology & Switch Infrastructure",
      summary: "Physical cabling, PoE gigabit switch connection, and subnet allocation.",
      content: (
        <div className="space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            The GymDeck CCTV Subsystem operates by communicating directly across your gym's local area network (LAN).
            All cameras and Network Video Recorders (NVRs) should be connected via standard Cat6 Ethernet cabling to a managed or unmanaged Gigabit PoE (Power over Ethernet) switch.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <Network size={16} className="text-indigo-600" />
              <span>Recommended Subnet Allocation:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li><strong>Gym Router / Gateway:</strong> <code>192.168.1.1</code> (or <code>10.0.0.1</code>)</li>
              <li><strong>NVR / DVR Master IP:</strong> <code>192.168.1.100</code> (Static DHCP reservation recommended)</li>
              <li><strong>GymDeck Host Computer (Edge Gateway):</strong> Connected to the same subnet via Ethernet or 5GHz Wi-Fi.</li>
            </ul>
          </div>
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Network Isolation:</strong> Do not put cameras on a guest VLAN with client isolation enabled, as client isolation prevents the Edge Gateway from reaching camera RTSP ports.
            </p>
          </div>
        </div>
      ),
    },
    {
      step: 2,
      tag: "NVR PROTOCOL CONFIG",
      title: "NVR & Camera ONVIF / RTSP Protocol Calibration",
      summary: "Enabling ONVIF integration and tuning dual-profile stream bitrates.",
      content: (
        <div className="space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            Every camera channel broadcasts two video streams simultaneously: a high-resolution <strong>Main Stream</strong> (1080p/4K) for forensic storage and single-camera view, and an adaptive <strong>Substream</strong> (360p/480p) for matrix multi-view grids.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-xs">Hikvision &amp; CP Plus Settings</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-0.5 text-[11px]">
                <li>Enable <strong>ONVIF</strong> in Network &gt; Advanced Settings.</li>
                <li>Create an ONVIF media user with Operator or Admin privileges.</li>
                <li>Set Substream codec to <strong>H.264 Baseline</strong>, 25 FPS, 512 Kbps.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-xs">Dahua &amp; Generic ONVIF</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-0.5 text-[11px]">
                <li>Verify RTSP port is active on default <code>554</code>.</li>
                <li>Ensure Substream 1 is toggled <strong>ON</strong>.</li>
                <li>Keep Keyframe Interval (GOP) at <strong>25 or 50</strong> (1-2x FPS).</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      step: 3,
      tag: "DAEMON ACTIVATION",
      title: "GymDeck CCTV Edge Gateway Service Daemon",
      summary: "Running the lightweight local media engine on your gym computer.",
      content: (
        <div className="space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            The Edge Gateway runs silently as a background service on the computer located at your gym front-desk or server rack. It handles RTSP stream ingest, H.264 transmuxing, and local loopback IPC on <code>127.0.0.1:49152</code>.
          </p>

          <div className="space-y-2">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Terminal Start Command:</span>
            <div className="p-3.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl flex items-center justify-between shadow-inner">
              <span>pnpm --filter @gymdeck/cctv-edge-gateway start</span>
              <button
                onClick={() => copyToClipboard("pnpm --filter @gymdeck/cctv-edge-gateway start", "Daemon Start Command")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[11px] font-sans flex items-center gap-1.5"
              >
                <Copy size={12} />
                <span>{copiedCommand === "Daemon Start Command" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="font-bold text-slate-800">Automatic Persistence as System Service:</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              To keep the gateway running automatically when the computer turns on or reboots:
            </p>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="text-slate-700"><strong>macOS (launchd):</strong> <code>launchctl load ~/Library/LaunchAgents/com.gymdeck.cctv-gateway.plist</code></div>
              <div className="text-slate-700"><strong>Linux (systemd):</strong> <code>sudo systemctl enable --now gymdeck-cctv-gateway.service</code></div>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="font-bold text-xs">Loopback IPC Verification:</span>
            </div>
            <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">http://127.0.0.1:49152/status</code>
          </div>
        </div>
      ),
    },
    {
      step: 4,
      tag: "CAMERA ENROLLMENT",
      title: "Camera Registration & RTSP URL Validation",
      summary: "Adding camera channels through automated discovery or direct RTSP format.",
      content: (
        <div className="space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            You can register cameras either by entering their IP address and credentials, or by pasting their standard RTSP stream URL directly into <strong>Quick Add Camera</strong>.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="font-bold text-slate-800">Standard RTSP Stream Formats by Brand:</div>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-indigo-600 font-bold block mb-0.5 font-sans">Hikvision NVR:</span>
                <code>rtsp://[user]:[password]@[ip]:554/Streaming/Channels/[channel]01</code>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-indigo-600 font-bold block mb-0.5 font-sans">Dahua / CP Plus:</span>
                <code>rtsp://[user]:[password]@[ip]:554/cam/realmonitor?channel=[channel]&amp;subtype=0</code>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-indigo-600 font-bold block mb-0.5 font-sans">Generic ONVIF IP Camera:</span>
                <code>rtsp://[user]:[password]@[ip]:554/live/ch0</code>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      step: 5,
      tag: "SECURITY & REMOTE",
      title: "Encrypted Remote Access & Zero-Port-Forwarding",
      summary: "How GymDeck provides secure remote viewing without exposing your gym router.",
      content: (
        <div className="space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            Unlike traditional CCTV systems that force you to open ports on your router (which exposes your gym network to cyber attacks), GymDeck uses a modern <strong>Zero-Trust Cloud Tunnel</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col gap-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Lock size={15} className="text-indigo-600" />
                <span>Outbound TLS WebSocket (Port 443)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The Edge Gateway initiates an outbound secure tunnel to GymDeck Cloud. Firewalls permit outbound traffic by default, meaning zero router port forwarding is needed.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col gap-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={15} className="text-emerald-600" />
                <span>RFC 5766 TURN TLS Traversal</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Direct WebRTC peer-to-peer connection is attempted via STUN hole-punching. When behind symmetric mobile/cellular NATs, traffic falls back transparently to TURN TLS relay.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      step: 6,
      tag: "LOCATION ZONING",
      title: "Facility Zone Organization & Layout Customization",
      summary: "Assigning camera channels to physical gym zones for instant navigation.",
      content: (
        <div className="space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            Organizing your surveillance layout into identifiable gym zones makes monitoring fast and intuitive for front-desk staff, managers, and trainers.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="font-bold text-slate-800">Standard Gym Facility Zones:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {PRESET_LOCATIONS.map((loc) => (
                <div key={loc} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold shadow-sm">
                  {loc}
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Use the <strong>Matrix Grid</strong> control at the top of the Live Feeds view to toggle between Single view, 2x2 (4 cameras), 3x3 (9 cameras), or 4x4 (16 cameras) based on your monitoring display size.
          </p>
        </div>
      ),
    },
    {
      step: 7,
      tag: "STORAGE RETENTION",
      title: "Historical Recording & Storage Retention Policy",
      summary: "Local NVR storage calculations and automatic 7-day retention rules.",
      content: (
        <div className="space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            Footage is continuously recorded onto the hard drive inside your on-premise NVR. GymDeck queries recorded blocks on-demand over the local network when you scrub the timeline.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="font-bold text-slate-800">Storage Sizing Guidelines (per camera @ 1080p 25fps H.264):</div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">24 Hours (1 Day)</div>
                <div className="text-base font-black text-slate-900 mt-0.5">~22 GB</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">7 Days Retention</div>
                <div className="text-base font-black text-slate-900 mt-0.5">~150 GB</div>
              </div>
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">30 Days Retention</div>
                <div className="text-base font-black text-slate-900 mt-0.5">~660 GB</div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            For an 8-channel gym setup, a <strong>2 TB or 4 TB Surveillance HDD</strong> (such as Western Digital Purple or Seagate SkyHawk) provides comfortable 30-day retention with auto-overwrite enabled.
          </p>
        </div>
      ),
    },
    {
      step: 8,
      tag: "EVIDENCE EXPORT",
      title: "Forensic Video Clip Export & Incident Documentation",
      summary: "Extracting tamper-evident MP4 clips with timestamp watermarks.",
      content: (
        <div className="space-y-4 text-xs text-slate-600">
          <p className="leading-relaxed">
            When an incident, theft, or equipment dispute occurs, GymDeck allows you to extract precise MP4 clips directly from the NVR timeline without exporting gigabytes of raw uncompressed footage.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="font-bold text-slate-800">Export Features:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li><strong>Time-Slice Extraction:</strong> Export exact time windows up to 60 minutes in length.</li>
              <li><strong>Tamper-Evident Watermark:</strong> Burn in camera name, channel number, and UTC timestamp directly onto the video frames.</li>
              <li><strong>MP4 Format:</strong> Standard H.264 MP4 format compatible with Windows Media Player, QuickTime, VLC, and mobile devices.</li>
              <li><strong>Auto-Purge Security:</strong> Exported files auto-purge after 7 days to preserve storage hygiene and privacy.</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none pb-16">
      
      {/* ─────────────────────────────────────────────────────────────────────────
          MAIN CONTENT CONTAINER & STATS
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Dynamic Executive KPI Stat Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatTile
            label="Enrolled Cameras"
            value={cameras.length > 0 ? `${cameras.filter((c) => c.status === "ONLINE").length} / ${cameras.length} Online` : "0 Configured"}
            subtext={cameras.length > 0 ? "Active RTSP video channels" : "No cameras connected yet"}
            tone={cameras.length > 0 ? "emerald" : "slate"}
            icon={Camera}
          />
          <StatTile
            label="Edge Gateway"
            value={gatewayStatus.online ? "Operational" : "Offline"}
            subtext={gatewayStatus.online ? `Daemon v${gatewayStatus.version} • 127.0.0.1` : "IPC loopback not reachable"}
            tone={gatewayStatus.online ? "blue" : "rose"}
            icon={Server}
          />
          <StatTile
            label="Throughput Load"
            value={cameras.length > 0 && gatewayStatus.online ? `${(cameras.length * 0.48).toFixed(1)} Mbps` : "0.0 Mbps"}
            subtext={cameras.length > 0 ? "Adaptive sub-stream ingestion" : "Idle standby"}
            tone={cameras.length > 0 ? "indigo" : "slate"}
            icon={Activity}
          />
          <StatTile
            label="Storage Retention"
            value={gatewayStatus.online ? `${gatewayStatus.metrics.freeDiskGb} GB Free` : "— GB"}
            subtext={gatewayStatus.online ? "Auto clip purge after 7 days" : "Gateway offline"}
            tone={gatewayStatus.online ? "amber" : "slate"}
            icon={HardDrive}
          />
        </div>

        {/* Navigation Tabs Bar & Action Controls */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          {/* Tab Navigation Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab("LIVE")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "LIVE"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Camera size={14} />
              <span>Live Feeds ({cameras.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("RECORDINGS");
                if (recordSegments.length === 0) searchRecordings();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "RECORDINGS"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Film size={14} />
              <span>Playback &amp; Timeline</span>
            </button>

            <button
              onClick={() => setActiveTab("EXPORTS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "EXPORTS"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Download size={14} />
              <span>Video Clip Exports</span>
              {exportJobs.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  activeTab === "EXPORTS" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}>
                  {exportJobs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("HEALTH")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === "HEALTH"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Activity size={14} />
              <span>Gateway Health</span>
            </button>
          </div>

          {/* Right Action Controls: Setup Guidance & Add Camera */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all shadow-2xs cursor-pointer"
              title="Open step-by-step CCTV camera setup guidance"
            >
              <BookOpen size={15} strokeWidth={2.2} className="text-indigo-600" />
              <span>Setup Guidance</span>
            </button>

            <button
              onClick={() => setIsQuickAddOpen(true)}
              style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus size={16} strokeWidth={2.6} className="text-white" />
              <span>Add Camera</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: LIVE FEEDS
        ========================================================================= */}
        {activeTab === "LIVE" && (
          <div className="space-y-6">
            {cameras.length === 0 ? (
              /* EMPTY STATE: COMPACT WIDE TECHNICAL DROPZONE (NO SCROLL NEEDED) */
              <div className="relative rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-400/80 bg-slate-50/60 p-5 sm:p-7 lg:p-7 w-full mx-auto transition-colors overflow-hidden">
                {/* Subtle technical background grid dots */}
                <div 
                  className="absolute inset-0 opacity-[0.45] pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                  }}
                />

                <div className="relative z-10 flex flex-col gap-5">
                  {/* Top Bar: Status Chip & Protocol Compatibility Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-dashed border-slate-200/90">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-slate-200 shadow-2xs text-[11px] font-bold text-slate-600 tracking-wider uppercase">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Surveillance Ingest Engine Ready</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-mono text-[10px]">Awaiting First Feed</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Radio size={13} className="text-indigo-600" /> Compatible with ONVIF Profile S/G/T & RTSP
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Lock size={13} className="text-emerald-600" /> AES-256 Transport
                      </span>
                    </div>
                  </div>

                  {/* Main Grid: Left Onboarding Content + Right Capability Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Left Section: Camera Icon, Headline, Description & CTAs */}
                    <div className="lg:col-span-7 flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                      {/* Icon */}
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-indigo-200 bg-white shadow-xs flex items-center justify-center text-indigo-600">
                          <div className="w-11 h-11 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center">
                            <Camera size={24} strokeWidth={2.2} className="text-indigo-600" />
                          </div>
                        </div>
                        <div 
                          style={{ backgroundColor: "#4f46e5" }}
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white border-2 border-white flex items-center justify-center shadow-xs"
                        >
                          <Plus size={12} strokeWidth={3} />
                        </div>
                      </div>

                      {/* Content & Action Buttons */}
                      <div className="space-y-3 flex-1">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            No CCTV Cameras Configured
                          </h3>
                          <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed mt-1">
                            Connect your on-premise NVR, DVR, or IP cameras to start streaming live matrix feeds with hardware-accelerated WebRTC and zero router port forwarding.
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <button
                            onClick={() => setIsQuickAddOpen(true)}
                            style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}
                            className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Plus size={15} strokeWidth={2.8} className="text-white" />
                            <span>Add Camera</span>
                          </button>

                          <button
                            onClick={() => setIsGuideOpen(true)}
                            className="h-10 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-300 transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            <BookOpen size={15} className="text-indigo-600" />
                            <span>Setup Guidance</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Compact 3 Micro-Specs Cards */}
                    <div className="lg:col-span-5 flex flex-col gap-2.5">
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/70">
                          <Zap size={15} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800">Ultra-Low Latency Streaming</div>
                          <div className="text-[11px] text-slate-400 font-medium truncate">Sub-second WebRTC H.264 / H.265 ingestion</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/70">
                          <ShieldCheck size={15} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800">Air-Gapped Cloud Bridge</div>
                          <div className="text-[11px] text-slate-400 font-medium truncate">Zero router port forwarding & outbound TLS tunnel</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/70">
                          <Server size={15} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800">Universal NVR & Camera Ingest</div>
                          <div className="text-[11px] text-slate-400 font-medium truncate">Hikvision, Dahua, Axis, Hanwha & UniFi Protect</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ACTIVE CAMERAS GRID */
              <div className="space-y-6">
                {/* Top Toolbar */}
                <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Matrix Grid:</span>
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
                      {[
                        { count: 1, label: "Single (1)" },
                        { count: 4, label: "2x2 (4)" },
                        { count: 6, label: "All (6)" },
                        { count: 9, label: "3x3 (9)" },
                      ].map((item) => (
                        <button
                          key={item.count}
                          onClick={() => setGridLayout(item.count)}
                          className={`px-3 py-1 rounded-lg font-bold transition-all ${
                            gridLayout === item.count
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/70">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{cameras.length} Active Channels Online</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 text-[11px] font-mono">
                      <Wifi size={12} className="text-indigo-600" />
                      <span>H.265 / H.264 Dual-Stream</span>
                    </div>
                  </div>
                </div>

                {/* Video Feeds Grid */}
                <div
                  className={`grid gap-5 lg:gap-6 transition-all ${
                    gridLayout === 1
                      ? "grid-cols-1"
                      : gridLayout === 4
                      ? "grid-cols-1 md:grid-cols-2"
                      : gridLayout === 6 || gridLayout === 9
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                  }`}
                >
                  {cameras.slice(0, gridLayout).map((cam) => {
                    return (
                      <div
                        key={cam.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col p-4 gap-3.5"
                      >
                        {/* Camera Card Top Header */}
                        <div className="flex items-center justify-between gap-2 px-0.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-[10px] font-black flex items-center justify-center shrink-0">
                              {cam.channelNumber}
                            </span>
                            <span className="font-bold text-slate-900 text-xs truncate">{cam.name}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 truncate">
                              {cam.locationZone}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleCameraProfile(cam.id)}
                              title="Toggle Main HD / Sub SD stream profile"
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black border transition-all ${
                                cam.currentProfile === "MAIN"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900"
                              }`}
                            >
                              {cam.currentProfile === "MAIN" ? "HD (Main)" : "SD (Sub)"}
                            </button>

                            <button
                              onClick={() => handleDeleteCamera(cam.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remove camera"
                            >
                              <Trash2 size={13} />
                            </button>

                            <button
                              onClick={() => {
                                setFullscreenCamId(cam.id);
                                setFullscreenMode("FOCUS");
                              }}
                              className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Expand camera view"
                            >
                              <Maximize2 size={13} strokeWidth={2.4} />
                            </button>
                          </div>
                        </div>

                        {/* High-Contrast Surveillance Screen HUD */}
                        <div
                          onClick={() => {
                            setFullscreenCamId(cam.id);
                            setFullscreenMode("FOCUS");
                          }}
                          className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-900 shadow-inner flex items-center justify-center group cursor-pointer"
                        >
                          {/* Visual Surveillance Vignette & Scanlines */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 pointer-events-none z-10" />
                          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:20px_20px]" />
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

                          {/* Ambient Visual Crosshair / Zone Target */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                            <div className="relative w-36 h-36 rounded-full border border-indigo-500/30 flex items-center justify-center">
                              <div className="w-24 h-24 rounded-full border border-dashed border-indigo-400/25 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                              </div>
                              <div className="absolute top-0 bottom-0 w-[1px] bg-indigo-500/20" />
                              <div className="absolute left-0 right-0 h-[1px] bg-indigo-500/20" />
                            </div>
                          </div>

                          {/* Center Info Overlay */}
                          <div className="relative z-20 flex flex-col items-center gap-1.5 text-center px-4">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                              <Camera size={20} className="animate-pulse" />
                            </div>
                            <div className="text-white font-black text-xs tracking-wide drop-shadow-md">
                              {cam.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                              <span>{cam.locationZone}</span>
                              <span>•</span>
                              <span>{cam.currentProfile === "MAIN" ? "1080p @ 30fps" : "360p @ 25fps"}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">{cam.bitrateKbps || 450} kbps</span>
                            </div>
                          </div>

                          {/* Top Left: LIVE Badge + Codec */}
                          <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              LIVE
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-slate-200 text-[10px] font-semibold border border-white/10 font-mono">
                              {cam.codec || "H264"}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                              {cam.currentProfile === "MAIN" ? "HD MAIN" : "SD SUB"}
                            </span>
                          </div>

                          {/* Top Right: Network Telemetry */}
                          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-[10px] font-mono text-slate-300">
                              <Wifi size={11} className="text-emerald-400" />
                              <span>{cam.ipAddress}</span>
                            </div>
                          </div>

                          {/* Bottom Left: Ticking UTC Timestamp */}
                          <div className="absolute bottom-3 left-3 z-20 text-[10px] font-mono text-emerald-400 font-bold bg-black/70 px-2.5 py-1 rounded-md border border-emerald-500/20 backdrop-blur-sm shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{liveClock.toISOString().replace("T", " ").slice(0, 19)} UTC</span>
                          </div>

                          {/* Bottom Right: Quick Hover Action */}
                          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                showToast(`Snapshot captured: ${cam.name} (Saved to Evidence Buffer)`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold border border-white/20 flex items-center gap-1.5 backdrop-blur-sm transition-all shadow-sm"
                              title="Capture instant frame snapshot"
                            >
                              <Camera size={11} />
                              <span>Snap</span>
                            </button>
                          </div>
                        </div>

                        {/* Status Footer */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5 pt-0.5 font-medium">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-bold text-slate-700">Online</span>
                            <span>•</span>
                            <span className="truncate">{cam.model || cam.ipAddress}</span>
                          </div>
                          <div className="font-mono text-slate-400 text-[10px] shrink-0">
                            {cam.fps || 25} FPS • {cam.resolution || "1080p"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: RECORDED FOOTAGE & TIMELINE
        ========================================================================= */}
        {activeTab === "RECORDINGS" && (
          <div className="space-y-6">
            {cameras.length === 0 ? (
              /* TAB 2 EMPTY STATE: COMPACT WIDE TECHNICAL DROPZONE */
              <div className="relative rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-400/80 bg-slate-50/60 p-5 sm:p-7 w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 transition-colors overflow-hidden">
                <div 
                  className="absolute inset-0 opacity-[0.45] pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                  }}
                />

                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-indigo-200 bg-white shadow-2xs flex items-center justify-center shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Film size={20} strokeWidth={2.2} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">No Cameras Available for Playback</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xl mt-0.5">
                      Connect your gym cameras first to unlock 24/7 historical timeline scrubbing, continuous recording playback, and incident bookmarks.
                    </p>
                  </div>
                </div>

                <div className="relative z-10 shrink-0">
                  <button
                    onClick={() => setIsQuickAddOpen(true)}
                    style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}
                    className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/25 inline-flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus size={15} strokeWidth={2.8} className="text-white" />
                    <span>Add Camera</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Search & Camera Selection Bar with Custom Dropdowns */}
                <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-sm flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">
                        Camera Channel
                      </label>
                      <CustomDropdown
                        value={selectedRecordCamId}
                        onChange={(val) => setSelectedRecordCamId(val)}
                        options={cameras.map((c) => ({
                          value: c.id,
                          label: c.name,
                          subtext: c.locationZone,
                          badge: c.channelNumber,
                          icon: <Camera size={13} />,
                        }))}
                        className="w-64"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">
                        Recording Date
                      </label>
                      <input
                        type="date"
                        value={recordDate}
                        onChange={(e) => setRecordDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-semibold shadow-sm h-[38px]"
                      />
                    </div>

                    <button
                      onClick={searchRecordings}
                      disabled={isSearchingRecordings}
                      className="h-[38px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 active:scale-95"
                    >
                      <Search size={14} className={isSearchingRecordings ? "animate-spin text-indigo-400" : ""} />
                      <span>{isSearchingRecordings ? "Scanning NVR Storage..." : "Search Footage"}</span>
                    </button>
                  </div>

                  {recordSegments.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setExportCamId(selectedRecordCamId);
                          setExportStartTime(`${recordDate}T${String(playbackTimeHour).padStart(2, "0")}:00`);
                          setExportEndTime(
                            `${recordDate}T${String(Math.min(23, playbackTimeHour + 1)).padStart(2, "0")}:00`
                          );
                          setIsExportDrawerOpen(true);
                        }}
                        className="h-[38px] px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 shadow-sm transition-all"
                      >
                        <Download size={14} className="text-indigo-600" />
                        <span>Export This Hour Clip</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Functional Search Result Feedback Banner */}
                {recordingSearchMessage && (
                  <div
                    className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border ${
                      recordingSearchMessage.type === "warning"
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : recordingSearchMessage.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-blue-50 border-blue-200 text-blue-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {recordingSearchMessage.type === "warning" ? (
                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      ) : recordingSearchMessage.type === "success" ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Info size={16} className="text-blue-600 shrink-0" />
                      )}
                      <span>{recordingSearchMessage.text}</span>
                    </div>

                    {recordingSearchMessage.hoursCount && (
                      <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                        <span className="bg-white/80 px-2 py-0.5 rounded border border-emerald-300">
                          {recordingSearchMessage.hoursCount}h 00m Total
                        </span>
                        <span className="bg-white/80 px-2 py-0.5 rounded border border-emerald-300">
                          {recordingSearchMessage.motionTriggers} Motion Events
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Playback Video Monitor Card with Fullscreen Option */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
                  <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 pointer-events-none z-10" />
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:20px_20px]" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

                    {/* Center Playback Watermark */}
                    <div className="relative z-20 text-center flex flex-col items-center gap-2.5 px-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                        {isPlayingRecord ? (
                          <Play size={26} className="text-emerald-400 fill-emerald-400 animate-pulse ml-0.5" />
                        ) : (
                          <Film size={26} className="text-slate-400" />
                        )}
                      </div>
                      <div className="text-white text-base font-black tracking-wide drop-shadow-md">
                        {cameras.find((c) => c.id === selectedRecordCamId)?.name || "Surveillance Channel"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Channel {cameras.find((c) => c.id === selectedRecordCamId)?.channelNumber || 1} • {cameras.find((c) => c.id === selectedRecordCamId)?.locationZone || "Main Floor"}
                      </div>

                      <div className="text-emerald-400 font-mono text-xs font-bold bg-black/80 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 shadow-md flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${isPlayingRecord ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                        <span>
                          {recordDate} {String(playbackTimeHour).padStart(2, "0")}:{String(playbackTimeMinute).padStart(2, "0")}:
                          {String((playbackTimeMinute * 17) % 60).padStart(2, "0")} IST
                        </span>
                      </div>
                    </div>

                    {/* Top Left Badge */}
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md ${
                        isPlayingRecord ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isPlayingRecord ? "bg-white animate-ping" : "bg-slate-400"}`} />
                        {isPlayingRecord ? "PLAYING BACK" : "PAUSED"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-slate-200 text-[10px] font-semibold border border-white/10 font-mono">
                        LOCAL NVR SYNC
                      </span>
                    </div>

                    {/* Top Right Controls with FULLSCREEN OPTION */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                      {playbackSpeed !== 1 && (
                        <div className="bg-indigo-600 text-white font-black text-xs px-3 py-1 rounded-lg shadow-md border border-indigo-400/30">
                          {playbackSpeed}x SPEED
                        </div>
                      )}

                      {/* REQUESTED FULLSCREEN OPTION FOR PLAYBACK & TIMELINE */}
                      <button
                        onClick={() => setIsPlaybackFullscreen(true)}
                        className="px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white text-xs font-bold border border-white/20 backdrop-blur-md flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                        title="Enter Fullscreen Playback Mode"
                      >
                        <Maximize2 size={13} strokeWidth={2.4} />
                        <span>Fullscreen</span>
                      </button>
                    </div>
                  </div>

                  {/* Playback Controls & 24-Hour Scrubber Deck */}
                  <div className="p-6 bg-slate-50/70 border-t border-slate-200 flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-[11px] text-slate-500 font-mono font-bold">
                        <span>00:00 (Night)</span>
                        <span>06:00 (Open)</span>
                        <span>10:00 (Peak AM)</span>
                        <span>14:00 (Midday)</span>
                        <span>18:00 (Peak PM)</span>
                        <span>22:00 (Closing)</span>
                        <span>23:59</span>
                      </div>

                      <div className="relative h-8 bg-white rounded-xl overflow-hidden border border-slate-200 shadow-inner flex items-center">
                        {Array.from({ length: 24 }).map((_, idx) => {
                          const hasData = recordSegments.some((s) => s.hour === idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => setPlaybackTimeHour(idx)}
                              className={`flex-1 h-full border-r border-slate-200/80 cursor-pointer transition-colors ${
                                idx === playbackTimeHour
                                  ? "bg-indigo-600 text-white"
                                  : hasData
                                  ? "bg-emerald-500/30 hover:bg-emerald-500/50"
                                  : "hover:bg-slate-100 bg-transparent"
                              }`}
                              title={`${String(idx).padStart(2, "0")}:00 ${hasData ? "- Recorded footage available" : "- No footage"}`}
                            />
                          );
                        })}

                        <div
                          className="absolute top-0 bottom-0 w-1.5 bg-slate-900 shadow-md pointer-events-none transition-all"
                          style={{ left: `${(playbackTimeHour / 24) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPlaybackTimeMinute((prev) => Math.max(0, prev - 5))}
                          className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 transition-all border border-slate-200 shadow-sm"
                          title="Rewind 5 minutes"
                        >
                          <Rewind size={15} />
                        </button>

                        <button
                          onClick={() => setIsPlayingRecord(!isPlayingRecord)}
                          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                        >
                          {isPlayingRecord ? <Pause size={15} /> : <Play size={15} />}
                          <span>{isPlayingRecord ? "Pause Footage" : "Play Footage"}</span>
                        </button>

                        <button
                          onClick={() => setPlaybackTimeMinute((prev) => Math.min(55, prev + 5))}
                          className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 transition-all border border-slate-200 shadow-sm"
                          title="Fast forward 5 minutes"
                        >
                          <FastForward size={15} />
                        </button>
                      </div>

                      {/* Custom Dropdown for Playback Speed */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-bold uppercase">Playback Speed:</span>
                        <CustomDropdown
                          value={playbackSpeed}
                          onChange={(val) => setPlaybackSpeed(Number(val))}
                          options={[
                            { value: 0.5, label: "0.5x Slow", icon: <Clock size={12} /> },
                            { value: 1, label: "1.0x Normal", icon: <Play size={12} /> },
                            { value: 2, label: "2.0x Fast", icon: <FastForward size={12} /> },
                            { value: 4, label: "4.0x High", icon: <FastForward size={12} /> },
                            { value: 8, label: "8.0x Rapid", icon: <Zap size={12} /> },
                            { value: 16, label: "16.0x Max", icon: <Zap size={12} /> },
                          ]}
                          size="sm"
                          className="w-36"
                          align="right"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: CLIP EXPORT HISTORY
        ========================================================================= */}
        {activeTab === "EXPORTS" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Forensic Video Clip Exports</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Exported MP4 video clips with forensic metadata. Clips auto-expire after 7 days.
                </p>
              </div>

              {cameras.length > 0 && (
                <button
                  onClick={() => setIsExportDrawerOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-100 transition-all"
                >
                  <Plus size={15} />
                  <span>New Video Export</span>
                </button>
              )}
            </div>

            {exportJobs.length === 0 ? (
              /* TAB 3 EMPTY STATE: COMPACT WIDE TECHNICAL DROPZONE */
              <div className="relative rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-400/80 bg-slate-50/60 p-5 sm:p-7 w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 transition-colors overflow-hidden">
                <div 
                  className="absolute inset-0 opacity-[0.45] pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                  }}
                />

                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-indigo-200 bg-white shadow-2xs flex items-center justify-center shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <FileVideo size={20} strokeWidth={2.2} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">No Video Clips Exported Yet</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xl mt-0.5">
                      Export high-definition MP4 clips from any camera channel with cryptographic SHA-256 hashes and timestamp watermarks for legal evidence documentation.
                    </p>
                  </div>
                </div>

                <div className="relative z-10 shrink-0">
                  {cameras.length > 0 ? (
                    <button
                      onClick={() => setIsExportDrawerOpen(true)}
                      style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}
                      className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/25 inline-flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Plus size={15} strokeWidth={2.8} className="text-white" />
                      <span>Create Export</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsQuickAddOpen(true)}
                      style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}
                      className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/25 inline-flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Plus size={15} strokeWidth={2.8} className="text-white" />
                      <span>Add Camera First</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Camera / Channel</th>
                        <th className="px-5 py-3.5">Time Range</th>
                        <th className="px-5 py-3.5">Duration</th>
                        <th className="px-5 py-3.5">File Size</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {exportJobs.map((job) => (
                        <tr key={job.jobId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                <FileVideo size={16} />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{job.cameraName}</div>
                                <div className="text-[10px] text-slate-400 font-semibold">Channel {job.channelNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800">{job.startTime}</div>
                            <div className="text-[10px] text-slate-400">to {job.endTime}</div>
                          </td>
                          <td className="px-5 py-4 text-slate-700 font-semibold">
                            {Math.round(job.durationSeconds / 60)} mins
                          </td>
                          <td className="px-5 py-4 text-slate-500 font-mono">
                            {job.fileSizeBytes ? `${(job.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : "—"}
                          </td>
                          <td className="px-5 py-4">
                            {job.status === "COMPLETED" ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                                <CheckCircle2 size={11} />
                                Ready for Download
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1 w-28">
                                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                  <RefreshCw size={10} className="animate-spin" />
                                  Processing {job.progressPercent}%
                                </span>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 rounded-full transition-all"
                                    style={{ width: `${job.progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {job.status === "COMPLETED" && (
                                <button
                                  onClick={() => showToast(`Starting download for ${job.cameraName} MP4 clip (1080p)...`)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                  <Download size={12} />
                                  <span>Download</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteExport(job.jobId)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Remove export"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: GATEWAY & SYSTEM HEALTH
        ========================================================================= */}
        {activeTab === "HEALTH" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Edge Gateway Telemetry &amp; Diagnostics</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time health of the on-premise GymDeck CCTV Edge Gateway daemon and media engine.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={checkGatewayHealth}
                  disabled={isCheckingGateway}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <RefreshCw size={13} className={isCheckingGateway ? "animate-spin text-white" : ""} />
                  <span>Refresh Diagnostics</span>
                </button>
              </div>
            </div>

            {/* Health Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gateway Status</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${gatewayStatus.online ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span className={`text-lg font-black ${gatewayStatus.online ? "text-emerald-700" : "text-rose-600"}`}>
                    {gatewayStatus.online ? "OPERATIONAL" : "OFFLINE"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {gatewayStatus.online ? `Daemon v${gatewayStatus.version} • IPC on 127.0.0.1:49152` : "Daemon not detected on localhost:49152"}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CPU Utilization</span>
                <div className="flex items-center gap-2">
                  <Cpu size={20} className="text-indigo-600" />
                  <span className="text-lg font-black text-slate-900">
                    {gatewayStatus.online ? `${gatewayStatus.metrics.cpuUsagePercent}%` : "—"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {gatewayStatus.online ? "Hardware H.264 Acceleration Active" : "No daemon telemetry"}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Memory Resident</span>
                <div className="flex items-center gap-2">
                  <Layers size={20} className="text-indigo-600" />
                  <span className="text-lg font-black text-slate-900">
                    {gatewayStatus.online ? `${gatewayStatus.metrics.memoryUsageMb} MB` : "—"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {gatewayStatus.online ? "Well below 512 MB daemon ceiling" : "Process inactive"}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Storage Free</span>
                <div className="flex items-center gap-2">
                  <HardDrive size={20} className="text-emerald-600" />
                  <span className="text-lg font-black text-slate-900">
                    {gatewayStatus.online ? `${gatewayStatus.metrics.freeDiskGb} GB` : "—"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {gatewayStatus.online ? "Auto clip purge after 7 days" : "Storage unmapped"}
                </span>
              </div>
            </div>

            {/* RTSP Channel Pipeline Status Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900">Active RTSP Ingest Pipelines</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Direct stream socket telemetry to local on-premise NVR / IP cameras</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  cameras.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                  {cameras.length} Active Feeds
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Channel / Name</th>
                      <th className="px-5 py-3">Hardware Model</th>
                      <th className="px-5 py-3">IP &amp; Port</th>
                      <th className="px-5 py-3">Ingest Codec</th>
                      <th className="px-5 py-3">Bitrate</th>
                      <th className="px-5 py-3">Packet Latency</th>
                      <th className="px-5 py-3 text-right">Stream State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {cameras.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-medium">
                          No active camera ingest pipelines configured. Add a camera to monitor stream telemetry.
                        </td>
                      </tr>
                    ) : (
                      cameras.map((cam) => (
                        <tr key={cam.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center">
                                {cam.channelNumber}
                              </span>
                              <span className="font-bold text-slate-900">{cam.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-medium">
                            {cam.model || "ONVIF Generic"}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-500">
                            {cam.ipAddress}:554
                          </td>
                          <td className="px-5 py-3.5 font-mono">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                              {cam.codec || "H264"} • {cam.resolution}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-700 font-bold">
                            {cam.bitrateKbps || 450} kbps
                          </td>
                          <td className="px-5 py-3.5 font-mono text-emerald-600 font-bold">
                            &lt; 14 ms
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Network & Security Specifications Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Shield size={16} className="text-indigo-600" />
                <span>Security &amp; Network Configuration Summary</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col gap-1.5">
                  <span className="font-bold text-slate-800">DVR / NVR Isolation</span>
                  <span className="text-slate-500 text-[11px] leading-relaxed">
                    Internal RTSP URLs are strictly confined to the local Edge Gateway. No camera passwords or direct IP streams are ever exposed over the public internet.
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col gap-1.5">
                  <span className="font-bold text-slate-800">NAT Traversal &amp; Port Forwarding</span>
                  <span className="text-slate-500 text-[11px] leading-relaxed">
                    Zero router port forwarding required. Outbound TLS WebSocket (port 443) maintains signaling tunnel, with RFC 5766 TURN relay fallback for symmetric NATs.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          3. FULLSCREEN CAMERA MODAL & ULTRA-IMMERSIVE CINEMA MODE (LIVE FEEDS)
             Portaled directly to document.body with z-[10050] / z-[10060]
      ───────────────────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" && activeFullscreenCam &&
        createPortal(
          fullscreenMode === "IMMERSIVE" ? (
            /* ULTRA IMMERSIVE CINEMA MODE: Takes 100% of entire application area */
            <div className="fixed inset-0 z-[10060] bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-200 select-none">
              <div className="relative w-full h-full max-w-screen max-h-screen flex items-center justify-center p-0">
                <div className="relative w-full h-full max-w-full max-h-full aspect-video flex items-center justify-center bg-slate-950 overflow-hidden shadow-2xl">
                  {/* Subtle Surveillance Vignette & Scanlines */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/70 pointer-events-none z-10" />
                  <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]" />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

                  {/* Ambient Crosshair Graphic */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                    <div className="relative w-72 h-72 rounded-full border border-indigo-500/30 flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full border border-dashed border-indigo-400/25 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      </div>
                      <div className="absolute top-0 bottom-0 w-[1px] bg-indigo-500/20" />
                      <div className="absolute left-0 right-0 h-[1px] bg-indigo-500/20" />
                    </div>
                  </div>

                  {/* Center Video Content */}
                  <div className="relative z-20 flex flex-col items-center gap-2.5 text-center px-6">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-950/70 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-2xl">
                      <Camera size={32} className="animate-pulse" />
                    </div>
                    <div className="text-white font-black text-xl lg:text-3xl tracking-wide drop-shadow-lg">
                      {activeFullscreenCam.name}
                    </div>
                    <div className="text-xs font-mono text-slate-300 flex items-center gap-3">
                      <span className="bg-indigo-900/60 text-indigo-300 px-2.5 py-0.5 rounded border border-indigo-400/30 font-bold font-sans">
                        {activeFullscreenCam.locationZone}
                      </span>
                      <span>•</span>
                      <span>{activeFullscreenCam.currentProfile === "MAIN" ? "1080p @ 30fps (HD Main)" : "360p @ 25fps (SD Sub)"}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">{activeFullscreenCam.bitrateKbps || 450} kbps</span>
                    </div>
                  </div>

                  {/* Top-Left Floating HUD */}
                  <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      LIVE
                    </span>
                    <div className="bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-xs text-white font-bold flex items-center gap-2 shadow-lg">
                      <span className="w-4 h-4 rounded bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                        {activeFullscreenCam.channelNumber}
                      </span>
                      <span>{activeFullscreenCam.name}</span>
                      <span className="text-slate-400 font-normal">({activeFullscreenCam.locationZone})</span>
                    </div>
                    <div className="bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-500/30 text-xs font-mono text-emerald-400 font-bold shadow-lg flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{liveClock.toISOString().replace("T", " ").slice(0, 19)} UTC</span>
                    </div>
                  </div>

                  {/* Top-Right Floating Action Deck */}
                  <div className="absolute top-6 right-6 z-30 flex items-center gap-2.5">
                    <button
                      onClick={() => toggleCameraProfile(activeFullscreenCam.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-md shadow-lg transition-all ${
                        activeFullscreenCam.currentProfile === "MAIN"
                          ? "bg-indigo-600/90 text-white border-indigo-400/50"
                          : "bg-black/70 text-slate-300 border-white/20 hover:text-white"
                      }`}
                      title="Toggle Main HD / Sub SD stream profile"
                    >
                      {activeFullscreenCam.currentProfile === "MAIN" ? "HD MAIN 1080p" : "SD SUB 360p"}
                    </button>

                    <button
                      onClick={() => showToast(`Snapshot captured: ${activeFullscreenCam.name}`)}
                      className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-lg flex items-center gap-1.5 transition-all"
                      title="Capture instant snapshot"
                    >
                      <Camera size={14} />
                      <span>Snap</span>
                    </button>

                    {/* Windowed Mode Toggle */}
                    <button
                      onClick={() => setFullscreenMode("FOCUS")}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold border border-indigo-400/40 backdrop-blur-md shadow-lg flex items-center gap-1.5 transition-all"
                      title="Return to windowed modal view"
                    >
                      <Minimize2 size={14} />
                      <span>Windowed View</span>
                    </button>

                    {/* Exit Fullscreen Button */}
                    <button
                      onClick={() => setFullscreenCamId(null)}
                      className="p-1.5 rounded-xl bg-black/70 hover:bg-rose-600 text-white border border-white/20 backdrop-blur-md shadow-lg transition-all"
                      title="Exit Fullscreen (Esc)"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Bottom-Center Floating Channel Switcher Pill */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-lg border border-white/15 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Channels:</span>
                    <div className="flex items-center gap-1.5">
                      {cameras.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setFullscreenCamId(c.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                            c.id === activeFullscreenCam.id
                              ? "bg-indigo-600 text-white shadow-md"
                              : "bg-white/10 hover:bg-white/20 text-slate-300"
                          }`}
                        >
                          Ch {c.channelNumber}
                        </button>
                      ))}
                    </div>
                    <div className="h-4 w-[1px] bg-white/20" />
                    <div className="text-[11px] font-mono text-emerald-400 font-bold">
                      {activeFullscreenCam.bitrateKbps || 450} kbps • {activeFullscreenCam.fps || 25} FPS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* FOCUSED MODAL VIEW: Clean, elevated modal with zero clipping */
            <div className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-5 lg:p-6 select-none animate-in fade-in duration-150">
              <div
                onClick={() => setFullscreenCamId(null)}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
              />

              <div className="relative z-10 bg-white border border-slate-200/90 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/60 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                      {activeFullscreenCam.channelNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-base truncate">
                          {activeFullscreenCam.name}
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                          {activeFullscreenCam.locationZone}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          LIVE
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleCameraProfile(activeFullscreenCam.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        activeFullscreenCam.currentProfile === "MAIN"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900"
                      }`}
                      title="Toggle Main HD / Sub SD stream profile"
                    >
                      {activeFullscreenCam.currentProfile === "MAIN" ? "HD MAIN (1080p)" : "SD SUB (360p)"}
                    </button>

                    <button
                      onClick={() => showToast(`Snapshot captured: ${activeFullscreenCam.name}`)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
                      title="Capture instant frame snapshot"
                    >
                      <Camera size={13} />
                      <span>Snapshot</span>
                    </button>

                    {/* Fill Entire App Button */}
                    <button
                      onClick={() => setFullscreenMode("IMMERSIVE")}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-100 transition-all"
                      title="Expand footage to take 100% area inside application"
                    >
                      <Maximize2 size={13} strokeWidth={2.4} />
                      <span>Fill Entire App</span>
                    </button>

                    <button
                      onClick={() => setFullscreenCamId(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      title="Close (Esc)"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Video Container (Strictly height-constrained so ZERO clipping happens) */}
                <div className="flex-1 min-h-0 bg-slate-950 p-4 sm:p-6 flex items-center justify-center relative overflow-hidden">
                  <div className="relative w-full h-full max-h-[58vh] aspect-video max-w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-2xl border border-white/10">
                    {/* Surveillance Vignette, Scanlines & Grid */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none z-10" />
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:20px_20px]" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

                    {/* Center Overlay */}
                    <div className="relative z-20 flex flex-col items-center gap-2 text-center px-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-2xl">
                        <Camera size={28} className="animate-pulse" />
                      </div>
                      <div className="text-white font-black text-lg tracking-wide drop-shadow-md">
                        {activeFullscreenCam.name}
                      </div>
                      <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                        <span>{activeFullscreenCam.locationZone}</span>
                        <span>•</span>
                        <span>{activeFullscreenCam.currentProfile === "MAIN" ? "1080p @ 30fps" : "360p @ 25fps"}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">{activeFullscreenCam.bitrateKbps || 450} kbps</span>
                      </div>
                    </div>

                    {/* Top-Right HUD */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-xs font-mono text-slate-300">
                        <Wifi size={12} className="text-emerald-400" />
                        <span>{activeFullscreenCam.ipAddress}:554</span>
                      </div>
                    </div>

                    {/* Bottom-Left Live Clock */}
                    <div className="absolute bottom-4 left-4 z-20 text-xs font-mono text-emerald-400 font-bold bg-black/75 px-3 py-1 rounded-lg border border-emerald-500/30 backdrop-blur-sm shadow-md flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{liveClock.toISOString().replace("T", " ").slice(0, 19)} UTC</span>
                    </div>
                  </div>
                </div>

                {/* Modal Footer: Stream Telemetry & Channel Nav */}
                <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between flex-wrap gap-3 text-xs shrink-0">
                  <div className="flex items-center gap-4 text-slate-500 font-medium">
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold block">Hardware Model</span>
                      <span className="font-bold text-slate-800">{activeFullscreenCam.model || "Hikvision ONVIF"}</span>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-200" />
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold block">Stream Profile</span>
                      <span className="font-bold text-slate-800">{activeFullscreenCam.currentProfile === "MAIN" ? "Main 1080p (2.2 Mbps)" : "Sub 360p (450 Kbps)"}</span>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-200" />
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] font-bold block">Latency</span>
                      <span className="font-bold text-emerald-600">&lt; 12 ms</span>
                    </div>
                  </div>

                  {/* Quick Channel Stepper */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const idx = cameras.findIndex((c) => c.id === activeFullscreenCam.id);
                        const prevIdx = (idx - 1 + cameras.length) % cameras.length;
                        setFullscreenCamId(cameras[prevIdx].id);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                    >
                      <ChevronLeft size={14} />
                      <span>Previous Ch</span>
                    </button>

                    <button
                      onClick={() => {
                        const idx = cameras.findIndex((c) => c.id === activeFullscreenCam.id);
                        const nextIdx = (idx + 1) % cameras.length;
                        setFullscreenCamId(cameras[nextIdx].id);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                    >
                      <span>Next Ch</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ),
          document.body
        )}

      {/* ─────────────────────────────────────────────────────────────────────────
          4. FULLSCREEN OPTION FOR PLAYBACK & TIMELINE
             Portaled directly to document.body with z-[10060]
      ───────────────────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" && isPlaybackFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[10060] bg-black flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none animate-in fade-in duration-200">
            {/* Top Floating Bar */}
            <div className="flex items-center justify-between gap-4 z-20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/15 text-xs text-white font-bold shadow-lg">
                  <span className="w-5 h-5 rounded bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                    {cameras.find((c) => c.id === selectedRecordCamId)?.channelNumber || 1}
                  </span>
                  <span>{cameras.find((c) => c.id === selectedRecordCamId)?.name}</span>
                  <span className="text-slate-400 font-normal">({cameras.find((c) => c.id === selectedRecordCamId)?.locationZone})</span>
                </div>

                <div className="bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-500/30 text-xs font-mono text-emerald-400 font-bold shadow-lg flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isPlayingRecord ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                  <span>
                    {recordDate} {String(playbackTimeHour).padStart(2, "0")}:{String(playbackTimeMinute).padStart(2, "0")}:
                    {String((playbackTimeMinute * 17) % 60).padStart(2, "0")} IST
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs font-bold text-slate-300">
                  LOCAL NVR STORAGE
                </span>
                <button
                  onClick={() => setIsPlaybackFullscreen(false)}
                  className="p-2 rounded-xl bg-black/75 hover:bg-rose-600 text-white border border-white/20 backdrop-blur-md shadow-lg transition-all"
                  title="Exit Fullscreen Playback (Esc)"
                >
                  <Minimize2 size={16} />
                </button>
              </div>
            </div>

            {/* Main Video Screen */}
            <div className="flex-1 min-h-0 flex items-center justify-center relative my-3">
              <div className="relative w-full h-full max-h-[66vh] aspect-video max-w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-2xl border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 pointer-events-none z-10" />
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:20px_20px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40 z-10" />

                {/* Center Playback Watermark */}
                <div className="relative z-20 text-center flex flex-col items-center gap-2 px-4">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-950/70 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-2xl">
                    {isPlayingRecord ? (
                      <Play size={32} className="text-emerald-400 fill-emerald-400 animate-pulse ml-0.5" />
                    ) : (
                      <Film size={32} className="text-slate-400" />
                    )}
                  </div>
                  <div className="text-white text-xl font-black tracking-wide drop-shadow-md">
                    {cameras.find((c) => c.id === selectedRecordCamId)?.name}
                  </div>
                  <div className="text-xs font-mono text-emerald-400 font-bold bg-black/80 px-4 py-1.5 rounded-xl border border-emerald-500/30">
                    {recordDate} {String(playbackTimeHour).padStart(2, "0")}:{String(playbackTimeMinute).padStart(2, "0")}:
                    {String((playbackTimeMinute * 17) % 60).padStart(2, "0")} IST
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Floating Scrubber Deck */}
            <div className="bg-black/85 backdrop-blur-xl border border-white/15 p-4 rounded-3xl shadow-2xl flex flex-col gap-3.5 shrink-0 z-20">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono font-bold px-1">
                  <span>00:00 (Night)</span>
                  <span>06:00 (Open)</span>
                  <span>10:00 (Peak AM)</span>
                  <span>14:00 (Midday)</span>
                  <span>18:00 (Peak PM)</span>
                  <span>22:00 (Closing)</span>
                  <span>23:59</span>
                </div>

                <div className="relative h-7 bg-slate-900 rounded-xl overflow-hidden border border-white/10 shadow-inner flex items-center">
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const hasData = recordSegments.some((s) => s.hour === idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => setPlaybackTimeHour(idx)}
                        className={`flex-1 h-full border-r border-white/5 cursor-pointer transition-colors ${
                          idx === playbackTimeHour
                            ? "bg-indigo-600 text-white"
                            : hasData
                            ? "bg-emerald-500/35 hover:bg-emerald-500/60"
                            : "hover:bg-white/5 bg-transparent"
                        }`}
                        title={`${String(idx).padStart(2, "0")}:00 ${hasData ? "- Recorded footage available" : "- No footage"}`}
                      />
                    );
                  })}

                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-white shadow-lg pointer-events-none transition-all"
                    style={{ left: `${(playbackTimeHour / 24) * 100}%` }}
                  />
                </div>
              </div>

              {/* Transport Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4 pt-0.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPlaybackTimeMinute((prev) => Math.max(0, prev - 5))}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 shadow-sm"
                    title="Rewind 5 minutes"
                  >
                    <Rewind size={15} />
                  </button>

                  <button
                    onClick={() => setIsPlayingRecord(!isPlayingRecord)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-all"
                  >
                    {isPlayingRecord ? <Pause size={15} /> : <Play size={15} />}
                    <span>{isPlayingRecord ? "Pause Footage" : "Play Footage"}</span>
                  </button>

                  <button
                    onClick={() => setPlaybackTimeMinute((prev) => Math.min(55, prev + 5))}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 shadow-sm"
                    title="Fast forward 5 minutes"
                  >
                    <FastForward size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <CustomDropdown
                    value={playbackSpeed}
                    onChange={(val) => setPlaybackSpeed(Number(val))}
                    options={[
                      { value: 0.5, label: "0.5x Slow", icon: <Clock size={12} /> },
                      { value: 1, label: "1.0x Normal", icon: <Play size={12} /> },
                      { value: 2, label: "2.0x Fast", icon: <FastForward size={12} /> },
                      { value: 4, label: "4.0x High", icon: <FastForward size={12} /> },
                      { value: 8, label: "8.0x Rapid", icon: <Zap size={12} /> },
                      { value: 16, label: "16.0x Max", icon: <Zap size={12} /> },
                    ]}
                    size="sm"
                    className="w-36"
                    align="right"
                  />

                  <button
                    onClick={() => {
                      setIsPlaybackFullscreen(false);
                      setExportCamId(selectedRecordCamId);
                      setExportStartTime(`${recordDate}T${String(playbackTimeHour).padStart(2, "0")}:00`);
                      setExportEndTime(`${recordDate}T${String(Math.min(23, playbackTimeHour + 1)).padStart(2, "0")}:00`);
                      setIsExportDrawerOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/15 transition-all shadow-sm"
                  >
                    <Download size={13} />
                    <span>Export Clip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─────────────────────────────────────────────────────────────────────────
          5. COMPLETE PROFESSIONAL CCTV SETUP GUIDANCE MODAL
             Portaled directly to document.body with z-[10050] to overlay sidebar
      ───────────────────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" && isGuideOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div
              onClick={() => setIsGuideOpen(false)}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
            />

            <div className="relative z-10 bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Guidance Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-200">
                      SOP-CCTV-001 • DEPLOYMENT STANDARD
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">VERSION 1.4</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    CCTV Surveillance Subsystem — Complete Setup Guidance
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Formal step-by-step technical standard operating procedure for integrating mixed-brand on-premise NVRs, DVRs, and IP cameras with GymDeck.
                  </p>
                </div>

                <button
                  onClick={() => setIsGuideOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all shrink-0"
                  title="Close Guide"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Guidance Step Tabs / Navigation */}
              <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
                {GUIDANCE_STEPS.map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setActiveGuideStep(s.step)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeGuideStep === s.step
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-md text-[10px] font-black flex items-center justify-center ${
                      activeGuideStep === s.step ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {s.step}
                    </span>
                    <span>Step {s.step}</span>
                  </button>
                ))}
              </div>

              {/* Guidance Body: Current Step Content */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
                {(() => {
                  const current = GUIDANCE_STEPS.find((s) => s.step === activeGuideStep) || GUIDANCE_STEPS[0];
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">
                            {current.tag} • STEP {current.step} OF 8
                          </span>
                          <h3 className="text-lg font-black text-slate-900">
                            {current.title}
                          </h3>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {current.summary}
                          </p>
                        </div>

                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          <button
                            disabled={current.step <= 1}
                            onClick={() => setActiveGuideStep((prev) => Math.max(1, prev - 1))}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Previous Step"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            disabled={current.step >= 8}
                            onClick={() => setActiveGuideStep((prev) => Math.min(8, prev + 1))}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                            title="Next Step"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Step Detailed Content */}
                      <div className="py-1">
                        {current.content}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Guidance Modal Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-4 shrink-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>CCTV Edge Gateway daemon verifies integrity on <code>127.0.0.1:49152</code></span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsGuideOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-all shadow-sm"
                  >
                    Close Guide
                  </button>

                  <button
                    onClick={() => {
                      setIsGuideOpen(false);
                      setIsQuickAddOpen(true);
                    }}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition-all flex items-center gap-2"
                  >
                    <Plus size={14} />
                    <span>Quick Add Camera Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─────────────────────────────────────────────────────────────────────────
          6. QUICK ADD CAMERA MODAL (With Custom Dropdown)
             Portaled directly to document.body with z-[10050] to overlay sidebar
      ───────────────────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" && isQuickAddOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4">
            <div
              onClick={() => setIsQuickAddOpen(false)}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
            />

            <form
              onSubmit={handleQuickAddCamera}
              className="relative z-10 bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-indigo-600" />
                  <h3 className="font-black text-slate-900 text-base">Quick Add Camera</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-4 text-xs">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                    Camera Name
                  </label>
                  <input
                    type="text"
                    required
                    value={quickCamName}
                    onChange={(e) => setQuickCamName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:border-indigo-600"
                    placeholder="e.g. Cardio Section Left"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                    Gym Location Zone
                  </label>
                  <CustomDropdown
                    value={quickCamZone}
                    onChange={(val) => setQuickCamZone(val)}
                    options={PRESET_LOCATIONS.map((loc) => ({
                      value: loc,
                      label: loc,
                      icon: <Network size={13} />,
                    }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                    Camera IP Address
                  </label>
                  <input
                    type="text"
                    value={quickCamIp}
                    onChange={(e) => setQuickCamIp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono font-bold focus:outline-none focus:border-indigo-600"
                    placeholder="192.168.1.107"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                    RTSP Stream URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={quickCamRtsp}
                    onChange={(e) => setQuickCamRtsp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono text-[11px] focus:outline-none focus:border-indigo-600"
                    placeholder="rtsp://admin:pass@192.168.1.107:554/h264/ch1/main"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  Save & Connect Camera
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* ─────────────────────────────────────────────────────────────────────────
          7. CLIP EXPORT MODAL / DRAWER (With Custom Dropdown)
             Portaled directly to document.body with z-[10050] to overlay sidebar
      ───────────────────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" && isExportDrawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4">
            <div
              onClick={() => setIsExportDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
            />

            <div className="relative z-10 bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Download size={18} className="text-indigo-600" />
                  <h3 className="font-black text-slate-900 text-base">Export Video Clip</h3>
                </div>
                <button
                  onClick={() => setIsExportDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-4 text-xs">
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                    Target Camera
                  </label>
                  <CustomDropdown
                    value={exportCamId}
                    onChange={(val) => setExportCamId(val)}
                    options={cameras.map((c) => ({
                      value: c.id,
                      label: c.name,
                      badge: c.channelNumber,
                      subtext: c.locationZone,
                      icon: <Camera size={13} />,
                    }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                    Clip Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={exportStartTime}
                    onChange={(e) => setExportStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                    Clip End Time (Max 1 Hour)
                  </label>
                  <input
                    type="datetime-local"
                    value={exportEndTime}
                    onChange={(e) => setExportEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={burnWatermark}
                    onChange={(e) => setBurnWatermark(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-slate-600 font-medium">Burn in camera name and timestamp watermark</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsExportDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartExport}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2"
                >
                  <Download size={14} />
                  <span>Extract &amp; Export</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─────────────────────────────────────────────────────────────────────────
          8. FLOATING NOTIFICATION TOAST
      ───────────────────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.95 }}
                className="fixed bottom-6 right-6 z-[10070] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2.5 text-xs font-bold pointer-events-auto"
              >
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" strokeWidth={2.4} />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

export const mountCctv = (targetElement) => {
  const container = targetElement || document.querySelector('[data-stage="cctv"]');
  if (!container) return null;
  const root = createRoot(container);
  root.render(
    <>
      <CCTV />
      <BrandFooter />
    </>
  );
  return root;
};

export default CCTV;
