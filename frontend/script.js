// Fix macOS NSSpellServer timeout spam by disabling spellcheck globally
const disableSpellcheck = (el) => {
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    el.spellcheck = false;
    el.autocomplete = "off";
    el.autocorrect = "off";
    el.autocapitalize = "off";
  }
};

// Initial pass for existing elements
document.querySelectorAll("input, textarea").forEach(disableSpellcheck);

// Observer for dynamically mounted React components
const spellcheckObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
          disableSpellcheck(node);
        }
        node.querySelectorAll("input, textarea").forEach(disableSpellcheck);
      }
    });
  });
});

spellcheckObserver.observe(document.body, { childList: true, subtree: true });

// Lazy loaded component mounting system with memory management
let activeRoots = new Map();

const canonicalKeys = {
  "membership-plans": "membership-plans-shared",
  "daily-checkin": "daily-checkin-shared",
  "attendance": "daily-checkin-shared",
};

const stageRegistry = [
  { stages: ["membership-plans"], load: () => import("./MembershipPlans.jsx"), mount: "mountMembershipPlans" },
  { stages: ["expiring-memberships"], load: () => import("./ExpiringMemberships.jsx"), mount: "mountExpiringMemberships" },
  { stages: ["freeze-pause"], load: () => import("./FreezePause.jsx"), mount: "mountFreezePause" },
  { stages: ["daily-checkin", "attendance"], load: () => import("./DailyCheckin.jsx"), mount: "mountDailyCheckin" },
  { stages: ["manual-entry"], load: () => import("./ManualEntry.jsx"), mount: "mountManualEntry" },
  { stages: ["attendance-reports"], load: () => import("./AttendanceReports.jsx"), mount: "mountAttendanceReports" },
  { stages: ["payments"], load: () => import("./CollectFees.jsx"), mount: "mountCollectFees" },
  { stages: ["pending-dues"], load: () => import("./PendingDues.jsx"), mount: "mountPendingDues" },
  { stages: ["payment-history"], load: () => import("./PaymentHistory.jsx"), mount: "mountPaymentHistory" },
  { stages: ["generate-receipt"], load: () => import("./GenerateReceipt.jsx"), mount: "mountGenerateReceipt" },
  { stages: ["renew-membership"], load: () => import("./RenewMembership.jsx"), mount: "mountRenewMembership" },
  { stages: ["trainers"], load: () => import("./AllTrainers.jsx"), mount: "mountAllTrainers" },
  { stages: ["assign-trainer"], load: () => import("./AssignTrainer.jsx"), mount: "mountAssignTrainer" },
  { stages: ["trainer-schedule"], load: () => import("./TrainerSchedule.jsx"), mount: "mountTrainerSchedule" },
  { stages: ["staff-roles"], load: () => import("./StaffRoles.jsx"), mount: "mountStaffRoles" },
  { stages: ["personal-training"], load: () => import("./PTClients.jsx"), mount: "mountPTClients" },
  { stages: ["pt-packages"], load: () => import("./PTPackages.jsx"), mount: "mountPTPackages" },
  { stages: ["session-tracking"], load: () => import("./SessionTracking.jsx"), mount: "mountSessionTracking" },
  { stages: ["trainer-earnings"], load: () => import("./TrainerEarnings.jsx"), mount: "mountTrainerEarnings" },
  { stages: ["notify-members"], load: () => import("./SendNotification.jsx"), mount: "mountSendNotification" },
  { stages: ["revenue-reports"], load: () => import("./RevenueReport.jsx"), mount: "mountRevenueReport" },
  { stages: ["attendance-analytics"], load: () => import("./AttendanceTrends.jsx"), mount: "mountAttendanceTrends" },
  { stages: ["member-growth"], load: () => import("./MembershipGrowth.jsx"), mount: "mountMembershipGrowth" },
  { stages: ["trainer-performance"], load: () => import("./TrainerPerformance.jsx"), mount: "mountTrainerPerformance", argKey: "trainerPerformanceStage" },
  { stages: ["gym-profile"], load: () => import("./GymProfile.jsx"), mount: "mountGymProfile", argKey: "gymProfileStage" },
  { stages: ["app-settings"], load: () => import("./AppSettings.jsx"), mount: "mountAppSettings", argKey: "appSettingsStage" },
  { stages: ["backup-restore"], load: () => import("./BackupRestore.jsx"), mount: "mountBackupRestore", argKey: "backupRestoreStage" },
  { stages: ["sync-status"], load: () => import("./DeviceSync.jsx"), mount: "mountDeviceSync", argKey: "syncStatusStage" },
  { stages: ["account"], load: () => import("./Profile.jsx"), mount: "mountProfile", argKey: "profileStage" },
  { stages: ["documents"], load: () => import("./MemberDocuments.jsx"), mount: "mountMemberDocuments" },
  { stages: ["past-members"], load: () => import("./PastMembers.jsx"), mount: "mountPastMembers" },
  { stages: ["id-proofs"], load: () => import("./IDProofs.jsx"), mount: "mountIDProofs" },
  { stages: ["agreements"], load: () => import("./Agreements.jsx"), mount: "mountAgreements" },
];

const stageMap = new Map();
for (const entry of stageRegistry) {
  for (const stage of entry.stages) {
    stageMap.set(stage, entry);
  }
}

const getCanonicalKey = (stage) => canonicalKeys[stage] || stage;

const mountStageLazy = async (stage) => {
  const canonicalKey = getCanonicalKey(stage);
  if (activeRoots.has(canonicalKey)) return;

  const entry = stageMap.get(stage);
  if (!entry) return;

  try {
    const mod = await entry.load();
    const mountFn = mod[entry.mount];
    if (!mountFn) {
      console.warn(`GymDeck: Mount function ${entry.mount} not found`);
      return;
    }
    const root = entry.argKey ? await mountFn(DOM[entry.argKey]) : await mountFn();
    if (root) activeRoots.set(canonicalKey, root);
  } catch (err) {
    console.error(`GymDeck: Error mounting stage ${stage}:`, err);
  }
};

const unmountInactiveStages = (currentStage) => {
  const currentCanonicalKey = getCanonicalKey(currentStage);

  for (const [stage, root] of activeRoots.entries()) {
    if (stage !== currentCanonicalKey && stage !== "dashboard") {
      try {
        root.unmount();
        activeRoots.delete(stage);
      } catch (err) {
        console.warn(`GymDeck: Failed to unmount ${stage}:`, err);
      }
    }
  }

};

// Pre-load critical modules for instant transitions
const welcomeOverlayPromise = import("./WelcomeOverlay.jsx");
const dashboardWidgetsPromise = import("./DashboardWidgets.jsx");

// Post-Login Welcome Sequence
const initWelcome = () => {
  const enterMode = sessionStorage.getItem("gymdeck-enter");

  if (enterMode === "dashboard") {
    sessionStorage.removeItem("gymdeck-enter");
    
    // Mount the welcome overlay as soon as the module is ready
    welcomeOverlayPromise.then(({ mountWelcomeOverlay }) => {
      mountWelcomeOverlay("Admin", () => {
        // Reveal the dashboard immediately after welcome overlay
        document.documentElement.classList.add("dashboard-enter-active");
        
        // Initialize dashboard widgets after welcome overlay
        dashboardWidgetsPromise.then(m => m.mountDashboardWidgets());
      });
    }).catch(err => {
      console.error("GymDeck: Welcome overlay failed, revealing dashboard", err);
      document.documentElement.classList.add("dashboard-enter-active");
      dashboardWidgetsPromise.then(m => m.mountDashboardWidgets());
    });
  } else if (document.documentElement.classList.contains("dashboard-enter")) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.add("dashboard-enter-active");
        // Initialize dashboard widgets for direct entries
        dashboardWidgetsPromise.then(m => m.mountDashboardWidgets());
      });
    });
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWelcome);
} else {
  initWelcome();
}

document.querySelectorAll(".icon-btn, .join-btn, .dots, .slider-nav button, .follow-btn, .see-all-btn, .plus-btn, .launch-btn").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
  });
});

const menuToggle = document.querySelector(".menu-toggle");
const sidebarOverlay = document.querySelector(".sidebar-overlay");
const sidebar = document.querySelector(".sidebar");
const pageShell = document.querySelector(".page-shell");
const sidebarMenuScroll = document.querySelector(".sidebar-menu-scroll");
const sidebarScrollIndicator = document.querySelector("[data-sidebar-scroll-indicator]");
const sidebarScrollThumb = document.querySelector("[data-sidebar-scroll-thumb]");
const mobileNavBreakpoint = window.matchMedia("(max-width: 1024px)");
const logoutTrigger = document.querySelector(".logout");
const logoutDialog = document.querySelector(".logout-dialog");
const logoutBackdrop = document.querySelector(".logout-dialog-backdrop");
const logoutCancel = document.querySelector("[data-logout-cancel]");
const logoutConfirm = document.querySelector("[data-logout-confirm]");
const documentModal = document.querySelector(".document-modal");
const documentModalBackdrop = document.querySelector(".document-modal-backdrop");
const verificationModal = document.querySelector(".verification-modal");
const verificationBackdrop = document.querySelector(".verification-backdrop");
const verificationCloseButton = document.querySelector("[data-verification-close]");
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const deleteConfirmBackdrop = document.getElementById("deleteConfirmBackdrop");
const filmstripContainer = document.querySelector("[data-filmstrip-container]");
const documentCloseButtons = Array.from(document.querySelectorAll("[data-document-close]"));
const photoViewButtons = Array.from(document.querySelectorAll("[data-photo-view]"));

// Re-register documentViewButtons since I deleted it in previous turn
const getDocumentViewButtons = () => Array.from(document.querySelectorAll(".doc-view-btn"));

// Mock Document Data Generator
const getMockDocuments = (memberName, memberId = "", docsLabel = "") => {
  // 1. Check Global Registry for real session documents first
  const key = memberId || memberName;
  if (memberDocsRegistry.has(key)) {
    return memberDocsRegistry.get(key);
  }

  // 2. Fallback to intelligent placeholders for professional look
  if (memberName === "Unnamed Member" || docsLabel === "No Documents") return [];
  
  const docs = [];
  // Use consistent keys for same member
  const salt = (memberId || memberName).substring(0, 5);

  if (docsLabel.toLowerCase().includes("aadhaar")) {
    docs.push({ 
        id: `aadhaar_${salt}`, 
        name: "Aadhaar Card", 
        status: "verified", 
        date: "May 12, 2026", 
        size: "1.4 MB", 
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        mimeType: "application/pdf"
    });
  }

  // Generic Fallback for "3 Documents" or comma-separated lists like "1,1,1"
  const docCountMatch = docsLabel.match(/(\d+)\s+Documents/i);
  const commaSeparatedList = docsLabel.split(',').map(s => s.trim()).filter(Boolean);
  
  if (docs.length === 0 && (docCountMatch || commaSeparatedList.length > 0 || docsLabel !== "No Documents")) {
      const count = docCountMatch ? parseInt(docCountMatch[1]) : (commaSeparatedList.length > 0 ? commaSeparatedList.length : 1);
      const safeCount = Math.min(Math.max(count, 1), 3); // Ensure at least 1, max 3
      
      for (let i = 1; i <= safeCount; i++) {
          const customName = (commaSeparatedList.length >= i && commaSeparatedList[i-1] !== "1") ? commaSeparatedList[i-1] : (i === 1 ? "Identity Proof" : i === 2 ? "Registration Form" : "Compliance Document");
          docs.push({
              id: `generic_${salt}_${i}`,
              name: customName,
              status: "verified",
              date: "June 08, 2026",
              size: "0.8 MB",
              // Use a reliable image placeholder since the PDF URL might be blocked by CSP or CORS
              url: `https://api.dicebear.com/7.x/shapes/svg?seed=${salt}_doc${i}&backgroundColor=f8f9fa`,
              mimeType: "image/svg+xml"
          });
      }
  }

  if (docsLabel.toLowerCase().includes("residential") || docsLabel.toLowerCase().includes("address") || docsLabel.toLowerCase().includes("proof")) {
    docs.push({ 
        id: `address_${salt}`, 
        name: "Residential Proof", 
        status: "verified", 
        date: "May 12, 2026", 
        size: "1.1 MB", 
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        mimeType: "application/pdf"
    });
  }

  return docs;
};

const setVerificationModalState = (isOpen, triggerButton = null) => {
  if (!verificationModal || !verificationBackdrop) return;

  if (isOpen) {
    lastDocumentTrigger = triggerButton || document.activeElement;
    document.body.classList.add("verification-modal-open");
    verificationCloseButton?.focus();
    return;
  }

  // Immediately unload PDF/Image and hide elements to avoid system toolbar overlay flashes during transitions
  const previewPdf = document.querySelector("[data-main-doc-pdf]");
  const previewImg = document.querySelector("[data-main-doc-preview]");
  if (previewPdf) {
    previewPdf.src = "about:blank";
    previewPdf.hidden = true;
  }
  if (previewImg) {
    previewImg.src = "";
    previewImg.hidden = true;
  }

  document.body.classList.remove("verification-modal-open");
  activeVerificationMemberId = null;
  activeVerificationMemberName = "";
  
  // Wait for transition to finish before removing the specific slide class
  setTimeout(() => {
    verificationModal?.classList.remove("verification-animate-slide");
  }, 1000);

  lastDocumentTrigger?.focus?.();
};

let activeZoom = 1.0;
let activeRotation = 0;
let activeTranslateX = 0;
let activeTranslateY = 0;
let activeVerificationMemberId = null;
let activeVerificationMemberName = "";

const applyDocTransform = () => {
  const previewImg = document.querySelector("[data-main-doc-preview]");
  const previewPdf = document.querySelector("[data-main-doc-pdf]");
  const viewport = document.querySelector(".doc-preview-window");
  
  if (viewport && viewport.clientWidth > 0 && activeZoom > 1.0) {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    const maxX = Math.max(0, (w * activeZoom - w) / 2 + w * 0.3);
    const maxY = Math.max(0, (h * activeZoom - h) / 2 + h * 0.3);
    activeTranslateX = Math.min(Math.max(activeTranslateX, -maxX), maxX);
    activeTranslateY = Math.min(Math.max(activeTranslateY, -maxY), maxY);
  } else if (activeZoom <= 1.0) {
    activeTranslateX = 0;
    activeTranslateY = 0;
  }
  
  const transformStyle = `translate(${activeTranslateX}px, ${activeTranslateY}px) scale(${activeZoom}) rotate(${activeRotation}deg)`;
  
  if (previewImg) {
    previewImg.style.width = "";
    previewImg.style.height = "";
    previewImg.style.maxWidth = "";
    previewImg.style.maxHeight = "";
    previewImg.style.transform = transformStyle;
  }
  if (previewPdf) {
    previewPdf.style.width = "";
    previewPdf.style.height = "";
    previewPdf.style.transform = transformStyle;
  }
};

const updateActiveDocument = (doc) => {
  const nameEl = document.querySelector("[data-active-doc-name]");
  const statusEl = document.querySelector("[data-active-doc-status]");
  const dateEl = document.querySelector("[data-active-doc-date]");
  const sizeEl = document.querySelector("[data-active-doc-size]");
  const previewImg = document.querySelector("[data-main-doc-preview]");
  const previewPdf = document.querySelector("[data-main-doc-pdf]");
  const previewWindow = document.querySelector(".doc-preview-window");

  if (nameEl) nameEl.textContent = doc.name;
  if (statusEl) {
    statusEl.textContent = doc.status.charAt(0).toUpperCase() + doc.status.slice(1);
    statusEl.className = `status-pill ${doc.status}`;
  }
  if (dateEl) dateEl.textContent = doc.date;
  if (sizeEl) sizeEl.textContent = doc.size;

  // Reset zoom, rotation & translation for new document
  activeZoom = 1.0;
  activeRotation = 0;
  activeTranslateX = 0;
  activeTranslateY = 0;
  applyDocTransform();

  // 1. Clear Loading State
  if (previewWindow) previewWindow.classList.remove("is-loading");

  // Determine if it should be rendered in an iframe (PDF) or an img tag
  const isPdf = doc.mimeType === "application/pdf" || 
                doc.name?.toLowerCase().endsWith(".pdf") || 
                (doc.url ? (doc.url.toLowerCase().endsWith(".pdf") || doc.url.toLowerCase().includes("pdf")) : false); 

  if (isPdf && previewPdf) {
    if (previewImg) previewImg.hidden = true;
    previewPdf.hidden = false;
    previewPdf.src = doc.url || "";

    if (previewWindow) previewWindow.classList.remove("is-loading");

  } else if (previewImg) {
    if (previewPdf) previewPdf.hidden = true;
    previewPdf.src = "";
    previewImg.hidden = false;
    
    previewImg.onload = () => {
        if (previewWindow) previewWindow.classList.remove("is-loading");
    };

    previewImg.src = doc.url || `https://api.dicebear.com/7.x/identicon/svg?seed=${doc.id}&backgroundColor=ffffff`;
    previewImg.style.opacity = "0";
    setTimeout(() => { previewImg.style.opacity = "1"; }, 50);
  }

  // Update selection in filmstrip
  document.querySelectorAll(".doc-thumb").forEach(thumb => {
    thumb.classList.toggle("is-active", thumb.dataset.docId === doc.id);
  });
};

const renderFilmstrip = (documents) => {
  if (!filmstripContainer) return;
  filmstripContainer.innerHTML = "";

  const emptyState = document.querySelector(".verification-empty-state");
  const previewWindow = document.querySelector("[data-doc-preview-window]");
  const infoBar = document.querySelector(".doc-info-bar");

  if (documents.length === 0) {
    if (emptyState) emptyState.hidden = false;
    if (previewWindow) previewWindow.hidden = true;
    if (infoBar) infoBar.style.visibility = "hidden";
    return;
  }

  if (emptyState) emptyState.hidden = true;
  if (previewWindow) previewWindow.hidden = false;
  if (infoBar) infoBar.style.visibility = "visible";

  // Document Document Fragment for Batch Injection (No Reflow Lags)
  const fragment = document.createDocumentFragment();

  documents.forEach((doc) => {
    const thumb = document.createElement("div");
    thumb.className = "doc-thumb";
    thumb.dataset.docId = doc.id;
    thumb.innerHTML = `
      <div class="thumb-preview-mini">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div class="thumb-content">
        <span class="thumb-label">${doc.name}</span>
        <div class="thumb-status-row">
          <span class="thumb-status-dot ${doc.status}"></span>
          <span class="thumb-status-text">${doc.status}</span>
        </div>
      </div>
    `;

    thumb.addEventListener("click", () => {
      updateActiveDocument(doc);
      thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
    fragment.appendChild(thumb);
  });

  filmstripContainer.appendChild(fragment);

  if (documents.length > 0) {
    updateActiveDocument(documents[0]);
    // Small delay to ensure render is complete before scrolling
    setTimeout(() => {
      const firstThumb = filmstripContainer.querySelector(".doc-thumb");
      firstThumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }, 100);
  }
};

const initVerificationCenter = async (row, triggerButton) => {
  const memberName = getMemberDisplayName(row);
  const portraitImg = row.querySelector(".member-photo")?.src || "";
  const joinDateEl = row.querySelector("[data-member-joined-date]");
  
  // FIX: Extract ID directly from row dataset
  const memberId = row.dataset.memberId || "#0000";
  activeVerificationMemberId = row.dataset.memberId || null;
  activeVerificationMemberName = memberName;
  const docsLabel = row.dataset.memberDocsLabel || "No Documents";

  // Update Left Sidebar (Identity Anchor)
  const vPortrait = document.querySelector("[data-verification-portrait]");
  const vName = document.querySelector("[data-verification-member-name]");
  const vJoined = document.querySelector("[data-verification-joined]");
  const vId = document.querySelector("[data-verification-id]");

  if (vPortrait) vPortrait.src = portraitImg;
  if (vName) vName.textContent = memberName;
  if (vJoined) vJoined.textContent = joinDateEl?.textContent?.replace("Date", "").trim() || "May 2026";
  if (vId) vId.textContent = memberId.substring(0, 8).toUpperCase();

  // Setup Identity Card Download Button
  const verDownloadBtn = document.querySelector("#verification-identity-card .btn-card-bottom-download");
  setupCardDownloadButton(verDownloadBtn, memberName, portraitImg);

  // 1. Show Loading State in Filmstrip
  if (filmstripContainer) {
    filmstripContainer.innerHTML = `<div class="filmstrip-loading">Loading Documents...</div>`;
  }
  
  setVerificationModalState(true, triggerButton);

  try {
    let documents = [];

    if (window.__TAURI__) {
        console.log(`GymDeck: Querying SQLite documents for memberId: ${memberId}`);
        const dbDocs = await window.__TAURI__.core.invoke("get_member_documents_command", { memberId: memberId });
        console.log(`GymDeck: Backend returned ${dbDocs ? dbDocs.length : 0} documents:`, dbDocs);
        
        if (dbDocs && Array.isArray(dbDocs)) {
          documents = await Promise.all(dbDocs.map(async d => {
              const mType = detectMimeType(d.file_content);
              const realSize = d.file_content ? formatFileSize(d.file_content.length) : (d.file_size || "0 KB");
              
              // Safe date parser to avoid RangeError on invalid formats
              let formattedDate = "Unknown Date";
              if (d.upload_date) {
                const parsedDate = new Date(d.upload_date);
                if (!isNaN(parsedDate.getTime())) {
                  formattedDate = parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                } else {
                  formattedDate = String(d.upload_date).split('T')[0] || "Unknown Date";
                }
              }

              const isPdf = mType === "application/pdf" || d.doc_name.toLowerCase().endsWith(".pdf");
              let dataUrl = null;
              if (d.file_content) {
                dataUrl = await bytesToDataUrl(d.file_content);
              }

              return {
                  id: d.id,
                  name: d.doc_name,
                  status: d.status,
                  date: formattedDate,
                  size: realSize,
                  url: dataUrl,
                  mimeType: mType
              };
          }));
        }
    }

    // 3. Fallback to Mock only if DB is empty and we have a label suggesting docs exist
    if (documents.length === 0) {
        console.log(`GymDeck: Fallback to mock documents for: ${memberName} (${memberId}), docsLabel: ${docsLabel}`);
        documents = getMockDocuments(memberName, memberId, docsLabel);
    }

    renderFilmstrip(documents);
  } catch (err) {
    console.error("GymDeck: Failed to load documents from DB:", err);
    // Display error context in empty state UI for easier user diagnosis
    const emptyStateTitle = document.querySelector(".verification-empty-state h3");
    const emptyStateText = document.querySelector(".verification-empty-state p");
    if (emptyStateTitle) emptyStateTitle.textContent = "Error Loading Documents";
    if (emptyStateText) emptyStateText.textContent = `${err.name || "Error"}: ${err.message || err}\n${err.stack || ""}`;
    renderFilmstrip([]); // Show empty state on error
  }
};

const documentMemberLabel = document.querySelector("[data-document-member]");
const documentImage = document.querySelector("[data-document-image]");
const addMemberModal = document.querySelector(".member-form-modal");
const addMemberBackdrop = document.querySelector(".member-form-backdrop");
const addMemberOpenButtons = Array.from(document.querySelectorAll("[data-add-member-open]"));
const addMemberCloseButtons = Array.from(document.querySelectorAll("[data-add-member-close]"));
const addMemberForm = document.querySelector(".member-form-grid");
const addMemberSaveButton = document.querySelector("[data-member-save]");
const addMemberFormAlert = document.querySelector("[data-member-form-alert]");
const addMemberDatePicker = document.querySelector("[data-date-picker]");
const addMemberDobInput = document.querySelector("[data-member-dob-input]");
const addMemberDobDisplay = document.querySelector("[data-member-dob-display]");
const addMemberDobTrigger = document.querySelector("[data-member-dob-trigger]");
const addMemberDatePickerPanel = document.querySelector("[data-date-picker-panel]");
const addMemberDatePickerTitle = document.querySelector("[data-date-picker-title]");
const addMemberDatePickerMonth = document.querySelector("[data-date-picker-month]");
const addMemberDatePickerGrid = document.querySelector("[data-date-picker-grid]");
const addMemberDatePickerYears = document.querySelector("[data-date-picker-years]");
const addMemberDatePickerPrev = document.querySelector("[data-date-picker-prev]");
const addMemberDatePickerNext = document.querySelector("[data-date-picker-next]");
const addMemberDatePickerToday = document.querySelector("[data-date-picker-today]");
const addMemberDatePickerClear = document.querySelector("[data-date-picker-clear]");
const addMemberUploadInputs = Array.from(document.querySelectorAll("[data-member-upload-input], [data-doc-upload-input]"));
const addMemberUploadTriggers = Array.from(document.querySelectorAll("[data-member-upload-trigger], [data-doc-upload-trigger]"));

// Document upload modal (post-save)
const docUploadAlert = document.querySelector("[data-doc-upload-alert]");
const docUploadCopy = document.querySelector("[data-doc-upload-copy]");
const docUploadBackButton = document.querySelector("[data-doc-upload-back]");
const docUploadNextButton = document.querySelector("[data-doc-upload-next]");
const planningBackButton = document.querySelector("[data-planning-back]");
const docUploadSaveButton = document.querySelector("[data-doc-upload-save-finish]");

const uploadPreviewUrls = new Map();
const memberDocsRegistry = new Map(); // Professional Registry for Session Documents

let memberFormMode = "add";
let editingMemberId = null;

/**
 * Enterprise Utility: Converts a Data URL (Base64) to a Byte Array for Rust consumption.
 */
const dataUrlToBytes = (dataUrl) => {
  const base64 = dataUrl.split(',')[1];
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return Array.from(bytes); // Rust Vec<u8> expects a JSON array of numbers
};

/**
 * Helper to format file size in bytes to a human readable KB or MB string.
 */
const formatFileSize = (bytesCount) => {
  if (!bytesCount) return "0 KB";
  if (bytesCount < 1024) return `${bytesCount} B`;
  const kb = bytesCount / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

/**
 * Detects the MIME type of a file from its magic bytes.
 */
const detectMimeType = (bytes) => {
  if (!bytes || bytes.length < 4) return "application/octet-stream";
  
  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  // PNG: \x89PNG (0x89 0x50 0x4E 0x47)
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  // JPEG: 0xFF 0xD8 0xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // WebP: RIFF...WEBP (0x52 0x49 0x46 0x46 ... 0x57 0x45 0x42 0x50)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return "image/webp";
    }
  }
  // GIF: GIF8
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  
  return "application/octet-stream";
};

const bytesToDataUrl = (bytes) => {
  return new Promise((resolve) => {
    const uint8 = new Uint8Array(bytes);
    const mimeType = detectMimeType(uint8);
    const blob = new Blob([uint8], { type: mimeType });
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result || "");
    reader.readAsDataURL(blob);
  });
};

const logoutDestination = "../index.html";
const authStorageKey = "gymdeck-authenticated";
const navDropdowns = Array.from(document.querySelectorAll("[data-nav-dropdown]"));
const navDropdownToggles = Array.from(document.querySelectorAll("[data-nav-dropdown-toggle]"));
const dashboardStage = document.querySelector('[data-stage="dashboard"]');
const membersStage = document.querySelector('[data-stage="members"]');
const comingSoonStage = document.querySelector('[data-stage="coming-soon"]');
const comingSoonFeature = document.querySelector(".coming-soon-feature");
const comingSoonButtons = Array.from(document.querySelectorAll("[data-view-target]"));
const memberSearchInput = document.querySelector("[data-member-search]");
const memberCount = document.querySelector("[data-member-count]");
const memberFilterButtons = Array.from(document.querySelectorAll("[data-member-filter]"));
const membersRefreshButton = document.querySelector(".members-icon-btn");
const membersEmptyState = document.querySelector("[data-members-empty]");
const emptyTitle = document.querySelector("[data-empty-title]");
const emptyText = document.querySelector("[data-empty-text]");
const clearSearchBtn = document.querySelector("[data-clear-search]");
const membersTableBody = document.querySelector(".members-table tbody");
const paginationContainer = document.querySelector("[data-members-pagination]");

// Member Statistics Selectors
const statLoadedProfiles = document.querySelector("[data-stat-loaded-profiles]");
const statVerifiedDocs = document.querySelector("[data-stat-verified-docs]");
const statJoinedQuarter = document.querySelector("[data-stat-joined-quarter]");
const statFollowUps = document.querySelector("[data-stat-follow-ups]");

const updateMemberStats = () => {
  const members = cachedMembers;
  const totalProfiles = members.length;
  
  if (statLoadedProfiles) {
    statLoadedProfiles.textContent = totalProfiles;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
  const quarterStartDate = new Date(currentYear, quarterStartMonth, 1);

  let verifiedDocsCount = 0;
  let joinedThisQuarterCount = 0;
  let followUpsCount = 0;

  for (const m of members) {
    if (m.notes && m.notes.length > 10) verifiedDocsCount++;
    if (m.joined_at) {
      const joined = new Date(m.joined_at);
      if (joined >= quarterStartDate) joinedThisQuarterCount++;
    }
    const hasPhone = m.phone && m.phone !== "0000000000" && m.phone !== "Not provided";
    const hasPhoto = m.profile_photo_path && !m.profile_photo_path.includes("dicebear.com");
    if (!hasPhone || !hasPhoto) followUpsCount++;
  }

  if (statVerifiedDocs) {
    statVerifiedDocs.textContent = verifiedDocsCount;
  }
  if (statJoinedQuarter) {
    statJoinedQuarter.textContent = joinedThisQuarterCount;
  }
  if (statFollowUps) {
    statFollowUps.textContent = followUpsCount;
    const followUpCard = statFollowUps.closest(".members-stat-card");
    const followUpText = followUpCard?.querySelector("p");
    if (followUpText) {
      followUpText.textContent = followUpsCount > 0 
        ? `${followUpsCount} profiles need more info or photos.` 
        : "No profile update tasks are pending.";
    }
  }
};
const paginationNumbers = document.querySelector("[data-pagination-numbers]");
const paginationPrev = document.querySelector("[data-pagination-prev]");
const paginationNext = document.querySelector("[data-pagination-next]");

let currentMembersPage = 1;
const MEMBERS_PER_PAGE = 5;
let cachedMembers = [];

// Create a DOM cache for frequently accessed dynamic stages
const DOM = {
  get membershipPlansStage() { return document.querySelector('[data-stage="membership-plans"]'); },
  get expiringMembershipsStage() { return document.querySelector('[data-stage="expiring-memberships"]'); },
  get freezePauseStage() { return document.querySelector('[data-stage="freeze-pause"]'); },
  get dailyCheckinStage() { return document.querySelector('[data-stage="daily-checkin"]'); },
  get manualEntryStage() { return document.querySelector('[data-stage="manual-entry"]'); },
  get attendanceReportsStage() { return document.querySelector('[data-stage="attendance-reports"]'); },
  get paymentsStage() { return document.querySelector('[data-stage="payments"]'); },
  get pendingDuesStage() { return document.querySelector('[data-stage="pending-dues"]'); },
  get paymentHistoryStage() { return document.querySelector('[data-stage="payment-history"]'); },
  get generateReceiptStage() { return document.querySelector('[data-stage="generate-receipt"]'); },
  get renewMembershipStage() { return document.querySelector('[data-stage="renew-membership"]'); },
  get trainersStage() { return document.querySelector('[data-stage="trainers"]'); },
  get assignTrainerStage() { return document.querySelector('[data-stage="assign-trainer"]'); },
  get trainerScheduleStage() { return document.querySelector('[data-stage="trainer-schedule"]'); },
  get staffRolesStage() { return document.querySelector('[data-stage="staff-roles"]'); },
  get ptClientsStage() { return document.querySelector('[data-stage="personal-training"]'); },
  get ptPackagesStage() { return document.querySelector('[data-stage="pt-packages"]'); },
  get sessionTrackingStage() { return document.querySelector('[data-stage="session-tracking"]'); },
  get trainerEarningsStage() { return document.querySelector('[data-stage="trainer-earnings"]'); },
  get notifyMembersStage() { return document.querySelector('[data-stage="notify-members"]'); },
  get revenueReportsStage() { return document.querySelector('[data-stage="revenue-reports"]'); },
  get attendanceAnalyticsStage() { return document.querySelector('[data-stage="attendance-analytics"]'); },
  get memberGrowthStage() { return document.querySelector('[data-stage="member-growth"]'); },
  get trainerPerformanceStage() { return document.querySelector('[data-stage="trainer-performance"]'); },
  get gymProfileStage() { return document.querySelector('[data-stage="gym-profile"]'); },
  get appSettingsStage() { return document.querySelector('[data-stage="app-settings"]'); },
  get backupRestoreStage() { return document.querySelector('[data-stage="backup-restore"]'); },
  get syncStatusStage() { return document.querySelector('[data-stage="sync-status"]'); },
  get profileStage() { return document.querySelector('[data-stage="profile"]'); },
  get memberDocumentsStage() { return document.querySelector('[data-stage="member-documents"]'); },
  get idProofsStage() { return document.querySelector('[data-stage="id-proofs"]'); },
  get agreementsStage() { return document.querySelector('[data-stage="agreements"]'); },
  get pastMembersStage() { return document.querySelector('[data-stage="past-members"]'); }
};
const viewLabels = {
  dashboard: "Dashboard",
  members: "All Members",
  "leads-prospects": "Leads & Prospects",
  "personal-training": "PT Clients",
  "add-new-member": "Add New Member",
  "past-members": "Past Members",
  "membership-plans": "Membership Plans",
  "expiring-memberships": "Expiring Memberships",
  "freeze-pause": "Freeze / Pause",
  "daily-checkin": "Daily Check-in",
  attendance: "Daily Check-in",
  "manual-entry": "Manual Entry",
  "attendance-reports": "Attendance Reports",
  payments: "Collect Fees",
  "pending-dues": "Pending Dues",
  "payment-history": "Payment History",
  "generate-receipt": "Generate Receipt",
  "renew-membership": "Renew Membership",
  trainers: "All Trainers",
  "assign-trainer": "Assign Trainer",
  "trainer-schedule": "Trainer Schedule",
  "staff-roles": "Staff Roles",
  "pt-packages": "PT Packages",
  "session-tracking": "Session Tracking",
  "trainer-earnings": "Trainer Earnings",
  "notify-members": "Send Notification",
  "whatsapp-alerts": "WhatsApp Alerts",
  "renewal-reminders": "Renewal Reminders",
  announcements: "Announcements",
  "revenue-reports": "Revenue Report",
  "attendance-analytics": "Attendance Trends",
  "member-growth": "Membership Growth",
  "trainer-performance": "Trainer Performance",
  documents: "Member Documents",
  "id-proofs": "ID Proofs",
  agreements: "Agreements",
  settings: "Settings",
  "gym-profile": "Gym Profile",
  "app-settings": "App Settings",
  "backup-restore": "Backup & Restore",
  "sync-status": "Device Sync (QR)",
  account: "Profile"
};
const previewOrder = Object.keys(viewLabels).filter((view) => view !== "dashboard");
const MEMBER_DELETED_STORAGE_KEY = "gymdeck-deleted-member-ids";
let lastFocusedElement = null;
let activeView = "dashboard";
let activeMemberFilter = "all";
let lastDocumentTrigger = null;
let lastAddMemberTrigger = null;
let activeMoreOptionsRow = null;
let activeCalendarDate = new Date();
let datePickerMode = "day";

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Optimizes an image by resizing and converting to WebP format via Canvas.
 * WebP provides superior visual quality (almost indistinguishable from original) 
 * while keeping file sizes extremely low (30% smaller than JPEG).
 * Default parameters: quality = 0.75, maxWidth = 1200.
 */
const compressImage = (file, quality = 0.75, maxWidth = 1200) => {
  return new Promise((resolve) => {
    // Only optimize images
    if (!file.type.startsWith("image/")) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while constraining to maxWidth
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        // Draw image directly. WebP supports alpha transparency natively.
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: "image/webp",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // If compression didn't help or failed, use original
              resolve(file);
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};


let sidebarScrollFrame = null;
let sidebarScrollIdleTimeout = null;

const getMemberFormFields = () =>
  addMemberForm
    ? Array.from(addMemberForm.querySelectorAll(".member-field"))
    : [];

const setMenuState = (isOpen) => {
  document.body.classList.toggle("sidebar-open", isOpen);

  if (menuToggle) {
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  }
};

const syncSidebarScrollIndicator = () => {
  sidebarScrollFrame = null;

  if (!sidebar || !sidebarMenuScroll || !sidebarScrollIndicator || !sidebarScrollThumb) {
    return;
  }

  const maxScroll = sidebarMenuScroll.scrollHeight - sidebarMenuScroll.clientHeight;
  const canScroll = maxScroll > 1;

  sidebar.classList.toggle("has-menu-scroll", canScroll);

  if (!canScroll) {
    sidebarScrollThumb.style.setProperty("--sidebar-scroll-thumb-y", "0px");
    return;
  }

  const trackHeight = sidebarScrollIndicator.clientHeight;
  const thumbHeight = sidebarScrollThumb.offsetHeight;
  const maxThumbOffset = Math.max(trackHeight - thumbHeight, 0);
  const scrollProgress = sidebarMenuScroll.scrollTop / maxScroll;
  const thumbOffset = Math.round(scrollProgress * maxThumbOffset);

  sidebarScrollThumb.style.setProperty("--sidebar-scroll-thumb-y", `${thumbOffset}px`);
};

const scheduleSidebarScrollIndicatorSync = () => {
  if (sidebarScrollFrame !== null) {
    return;
  }

  sidebarScrollFrame = requestAnimationFrame(syncSidebarScrollIndicator);
};

const revealSidebarScrollIndicator = () => {
  if (!sidebar) {
    return;
  }

  sidebar.classList.add("is-menu-scrolling");
  window.clearTimeout(sidebarScrollIdleTimeout);
  sidebarScrollIdleTimeout = window.setTimeout(() => {
    sidebar.classList.remove("is-menu-scrolling");
  }, 650);
};

const refreshSidebarScrollIndicator = () => {
  scheduleSidebarScrollIndicatorSync();
  window.setTimeout(scheduleSidebarScrollIndicatorSync, 260);
};

const refreshSidebarRailAfterTransition = () => {
  refreshSidebarScrollIndicator();
  window.setTimeout(refreshSidebarScrollIndicator, 560);
};

const setSidebarRailExpanded = (isExpanded) => {
  pageShell?.classList.toggle("is-sidebar-expanded", isExpanded);
  refreshSidebarRailAfterTransition();
};

const setLogoutDialogState = (isOpen) => {
  if (!logoutDialog || !logoutBackdrop) {
    return;
  }

  if (isOpen) {
    lastFocusedElement = document.activeElement;
    logoutDialog.hidden = false;
    logoutBackdrop.hidden = false;
    document.body.classList.add("logout-dialog-open");
    logoutCancel?.focus();
    return;
  }

  document.body.classList.remove("logout-dialog-open");
  logoutDialog.hidden = true;
  logoutBackdrop.hidden = true;
  lastFocusedElement?.focus?.();
};

const setDocumentModalState = (isOpen, triggerButton = null) => {
  if (!documentModal || !documentModalBackdrop) {
    return;
  }

  if (isOpen) {
    lastDocumentTrigger = triggerButton || document.activeElement;
    documentModal.hidden = false;
    documentModalBackdrop.hidden = false;
    document.body.classList.add("document-modal-open");
    documentCloseButtons[0]?.focus();
    return;
  }

  document.body.classList.remove("document-modal-open");
  documentModal.hidden = true;
  documentModalBackdrop.hidden = true;
  lastDocumentTrigger?.focus?.();
};

const setAddMemberModalState = (isOpen, triggerButton = null) => {
  if (!addMemberModal || !addMemberBackdrop) {
    return;
  }

  if (isOpen) {
    lastAddMemberTrigger = triggerButton || document.activeElement;

    // Reset to Page 1 when opening
    addMemberModal.classList.remove("is-page-2");
    addMemberModal.classList.remove("is-page-3");
    addMemberModal.classList.remove("is-page-4");
    addMemberModal.classList.remove("is-only-doc-upload");

    addMemberModal.hidden = false;
    addMemberBackdrop.hidden = false;

    // Force a reflow to ensure the transition triggers
    addMemberModal.offsetHeight;

    document.body.classList.add("member-form-open");
    addMemberModal.querySelector("input")?.focus();
    return;
  }

  document.body.classList.remove("member-form-open");

  // Wait for transition to finish before hiding (matching the 0.6s in CSS)
  setTimeout(() => {
    if (!document.body.classList.contains("member-form-open")) {
      addMemberModal.hidden = true;
      addMemberBackdrop.hidden = true;
      closeDatePicker();
      resetUploadFields();

      // Reset internal page state
      addMemberModal.classList.remove("is-page-2");
      addMemberModal.classList.remove("is-page-3");
      addMemberModal.classList.remove("is-page-4");
      addMemberModal.classList.remove("is-only-doc-upload");
      if (docUploadBackButton) {
        docUploadBackButton.textContent = "← Back";
      }
      if (docUploadNextButton) {
        const span = docUploadNextButton.querySelector("span");
        const svg = docUploadNextButton.querySelector("svg");
        if (span) span.textContent = "NEXT";
        if (svg) svg.style.display = "";
      }
      if (!document.body.classList.contains("verification-modal-open")) {
        activeVerificationMemberId = null;
        activeVerificationMemberName = "";
      }
    }
  }, 600);

  lastAddMemberTrigger?.focus?.();
};

const setDocUploadModalState = (isOpen, memberName = "") => {
  if (!addMemberModal) return;

  if (isOpen) {
    // Switch to page 3 via class (previously 2)
    addMemberModal.classList.add("is-page-3");
    addMemberModal.classList.remove("is-page-2");
    addMemberModal.classList.remove("is-page-4");

    if (memberName && docUploadCopy) {
      docUploadCopy.textContent = `"${memberName}" saved successfully. Add supporting documents to complete the profile.`;
    }
    return;
  }

  // To close, we close the main modal
  setAddMemberModalState(false);
};


const formatCalendarDate = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);

const formatCalendarValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseCalendarValue = (value) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
};

const closeDatePicker = () => {
  addMemberDatePickerPanel.hidden = true;
  addMemberDatePicker?.classList.remove("is-open");
  datePickerMode = "day";
};

const openDatePicker = () => {
  addMemberDatePickerPanel.hidden = false;
  addMemberDatePicker?.classList.add("is-open");
};

const setFieldErrorState = (field, message = "") => {
  const errorNode = field?.querySelector(".member-field-error");

  if (errorNode) {
    errorNode.hidden = true;
  }
};

const clearMemberFormErrors = () => {
  getMemberFormFields().forEach((field) => {
    setFieldErrorState(field, "");
  });

  if (addMemberFormAlert) {
    addMemberFormAlert.hidden = true;
    addMemberFormAlert.textContent = "";
  }
};

const clearUploadPreview = (input) => {
  const field = input.closest(".member-field") || input.closest(".doc-upload-card");
  const preview = field?.querySelector("[data-member-upload-preview], [data-doc-upload-preview]");
  const image = field?.querySelector("[data-member-upload-image], [data-doc-upload-image]");
  const pdf = field?.querySelector("[data-member-upload-pdf], [data-doc-upload-pdf]");
  const existingData = uploadPreviewUrls.get(input);

  if (existingData?.objectUrl) {
    URL.revokeObjectURL(existingData.objectUrl);
    uploadPreviewUrls.delete(input);
  }

  if (image) {
    image.src = "";
    image.alt = "";
    image.hidden = true;
  }

  if (pdf) {
    if (pdf.tagName === "IFRAME") {
      pdf.src = "";
    }
    pdf.hidden = true;
  }

  if (preview) {
    preview.hidden = true;
  }
};

const syncUploadMeta = (input) => {
  const field = input.closest(".member-field") || input.closest(".doc-upload-card");
  const meta = field?.querySelector("[data-member-upload-meta], [data-doc-upload-meta]");

  if (!meta) {
    return;
  }

  const selectedFile = input.files?.[0];
  meta.textContent = selectedFile ? "" : "No file selected";
  meta.title = selectedFile ? "" : "No file selected";
  meta.hidden = Boolean(selectedFile);
};

const syncUploadPreview = async (input) => {
  const field = input.closest(".member-field") || input.closest(".doc-upload-card");
  const preview = field?.querySelector("[data-member-upload-preview], [data-doc-upload-preview]");
  const image = field?.querySelector("[data-member-upload-image], [data-doc-upload-image]");
  const pdf = field?.querySelector("[data-member-upload-pdf], [data-doc-upload-pdf]");
  let selectedFile = input.files?.[0];
  const label = input.dataset.uploadLabel || input.dataset.docUploadInput || "Document";

  clearUploadPreview(input);

  if (!selectedFile || !preview) {
    return;
  }

  try {
    const originalSize = selectedFile.size;
    let isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      console.log(`GymDeck: PDF file detected: ${selectedFile.name} (${(originalSize / 1024).toFixed(1)}KB). Bypassing client-side WebP flattening to preserve multi-page integrity. Backend will handle compression.`);
    } else if (selectedFile.type.startsWith("image/")) {
      // High-quality WebP compression for documents: quality 0.75, maxWidth 1600.
      // This keeps text highly legible and sharp while reducing file size to 100-200KB.
      const optimizedFile = await compressImage(selectedFile, 0.75, 1600);
      
      if (optimizedFile.size < originalSize) {
        console.log(`GymDeck: Optimized ${label} from ${(originalSize / 1024).toFixed(1)}KB to ${(optimizedFile.size / 1024).toFixed(1)}KB`);
        
        // Replace the file in the input element
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(optimizedFile);
        input.files = dataTransfer.files;
        selectedFile = optimizedFile;
      }
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    const base64Data = await fileToBase64(selectedFile);
    
    uploadPreviewUrls.set(input, { objectUrl, base64Data });

    isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

    if (isPdf && pdf) {
      if (pdf.tagName === "IFRAME") {
        pdf.src = objectUrl + "#toolbar=0&navpanes=0";
      } else {
        pdf.title = selectedFile.name;
      }
      pdf.hidden = false;
      preview.hidden = false;
    } else if (!isPdf && image) {
      image.src = objectUrl;
      image.alt = `${label} preview`;
      image.hidden = false;
      preview.hidden = false;
    }
  } catch (err) {
    console.error("GymDeck: Error generating file preview:", err);
  }
};

const resetUploadFields = () => {
  addMemberUploadInputs.forEach((input) => {
    clearUploadPreview(input);
    input.value = "";
    syncUploadMeta(input);
  });

  // Reset Photo Upload specific elements
  if (photoUploadInput) photoUploadInput.value = "";
  if (photoUploadPreview) {
      photoUploadPreview.src = "";
      photoUploadPreview.hidden = true;
  }
  if (photoPlaceholder) {
      photoPlaceholder.classList.remove("is-hidden");
      photoPlaceholder.style.display = "flex";
  }
  const circleEl = document.querySelector(".photo-preview-circle");
  if (circleEl) circleEl.classList.remove("has-photo");
  
  const changePhotoBtn = document.querySelector("[data-photo-change-btn]");
  if (changePhotoBtn) changePhotoBtn.classList.remove("is-visible");
};

const formatDisplayDate = (value) => {
  if (!value) {
    return "Not provided";
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parsedDate);
};

const formatJoinDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatJoinTimeValue = (date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatJoinDateDisplay = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);

const formatJoinTimeDisplay = (date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);

const escapeHtml = (value = "") =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");


const getMemberDobCells = () => Array.from(document.querySelectorAll("[data-member-dob]"));

const getMemberDisplayName = (row) =>
  row?.dataset.memberName ||
  row?.querySelector(".member-name-cell strong")?.textContent?.trim() ||
  row?.children[1]?.textContent?.trim() ||
  "Member Record";

const getMemberField = (label) =>
  addMemberForm?.querySelector(`.member-field[data-field-label="${label}"]`);

const getFieldValue = (label, selector = "input, textarea, select") =>
  getMemberField(label)?.querySelector(selector)?.value.trim() || "";

const syncCustomDropdownValue = (wrapper) => {
  const selectEl = wrapper.querySelector("select");
  const triggerValue = wrapper.querySelector(".custom-dropdown-value");
  const items = wrapper.querySelectorAll(".custom-dropdown-item");

  if (!selectEl || !triggerValue) return;

  const value = selectEl.value;
  const option = Array.from(selectEl.options).find(o => o.value === value);
  
  triggerValue.textContent = option ? option.textContent : (selectEl.options[0]?.textContent || "");

  items.forEach(item => {
    if (item.dataset.value === value) {
      item.classList.add("is-selected");
    } else {
      item.classList.remove("is-selected");
    }
  });
};

const syncAllCustomDropdowns = () => {
  document.querySelectorAll(".custom-select-wrapper").forEach(syncCustomDropdownValue);
};

const syncCustomHeightUI = (field, value) => {
  const cmInput = field?.querySelector(".cm-input");
  const ftInput = field?.querySelector(".ft-input");
  const inInput = field?.querySelector(".in-input");
  const cmBtn = field?.querySelector('[data-unit="cm"]');
  const ftBtn = field?.querySelector('[data-unit="ft"]');
  const ftArea = field?.querySelector(".ft-in-inputs");

  if (!cmInput || !ftInput || !inInput || !cmBtn || !ftBtn || !ftArea) return;

  const valStr = (value || "").trim();
  if (valStr.endsWith("cm")) {
    const cmVal = valStr.replace("cm", "").trim();
    cmInput.value = cmVal;
    
    cmBtn.classList.add("active");
    ftBtn.classList.remove("active");
    cmInput.hidden = false;
    ftArea.hidden = true;
  } else if (valStr.includes("ft") || valStr.includes("in")) {
    let ft = "";
    let inch = "";
    const ftMatch = valStr.match(/(\d+)\s*(?:ft|')/i);
    const inMatch = valStr.match(/(\d+)\s*(?:in|")/i);
    if (ftMatch) ft = ftMatch[1];
    if (inMatch) inch = inMatch[1];
    
    ftInput.value = ft;
    inInput.value = inch;

    ftBtn.classList.add("active");
    cmBtn.classList.remove("active");
    cmInput.hidden = true;
    ftArea.hidden = false;
  } else {
    cmInput.value = valStr;
    ftInput.value = "";
    inInput.value = "";
    
    cmBtn.classList.add("active");
    ftBtn.classList.remove("active");
    cmInput.hidden = false;
    ftArea.hidden = true;
  }
};

const resetCustomHeightUI = () => {
  const heightField = getMemberField("Height");
  if (heightField) {
    syncCustomHeightUI(heightField, "");
  }
};

const syncCustomWeightUI = (field, value) => {
  const kgInput = field?.querySelector(".kg-input");
  const lbsInput = field?.querySelector(".lbs-input");
  const kgBtn = field?.querySelector('[data-unit="kg"]');
  const lbsBtn = field?.querySelector('[data-unit="lbs"]');

  if (!kgInput || !lbsInput || !kgBtn || !lbsBtn) return;

  const valStr = (value || "").trim();
  if (valStr.endsWith("lbs") || valStr.endsWith("lb")) {
    const lbsVal = valStr.replace(/lbs|lb/g, "").trim();
    lbsInput.value = lbsVal;
    kgInput.value = "";
    
    lbsBtn.classList.add("active");
    kgBtn.classList.remove("active");
    lbsInput.hidden = false;
    kgInput.hidden = true;
  } else {
    const kgVal = valStr.replace("kg", "").trim();
    kgInput.value = kgVal;
    lbsInput.value = "";

    kgBtn.classList.add("active");
    lbsBtn.classList.remove("active");
    kgInput.hidden = false;
    lbsInput.hidden = true;
  }
};

const resetCustomWeightUI = () => {
  const weightField = getMemberField("Weight");
  if (weightField) {
    syncCustomWeightUI(weightField, "");
  }
};

const resetMemberForm = () => {
  addMemberForm?.reset();

  if (addMemberDobInput) {
    addMemberDobInput.value = "";
  }

  syncDateDisplay();
  activeCalendarDate = new Date();
  datePickerMode = "day";
  renderDatePicker();
  closeDatePicker();
  resetUploadFields();
  clearMemberFormErrors();
  syncAllCustomDropdowns();
  resetCustomHeightUI();
  resetCustomWeightUI();

  if (docUploadSaveButton) {
    docUploadSaveButton.removeAttribute("disabled");
  }
};

const setFieldValue = (label, value, selector = "input, textarea, select") => {
  const field = getMemberField(label);
  const input = field?.querySelector(selector);
  if (input) {
    input.value = value;
    
    // Sync custom dropdown wrapper if present
    const wrapper = field?.querySelector(".custom-select-wrapper");
    if (wrapper) {
      syncCustomDropdownValue(wrapper);
    }
    
    // Sync custom height selectors if present
    if (label === "Height") {
      syncCustomHeightUI(field, value);
    }
    // Sync custom weight selectors if present
    if (label === "Weight") {
      syncCustomWeightUI(field, value);
    }
  }
};

const prefillMemberForm = (row) => {
  resetMemberForm();
  
  setFieldValue("Full Name", row.dataset.memberName || "");
  setFieldValue("Contact Number", row.dataset.memberPhone || "");
  setFieldValue("Alternate Contact", row.dataset.memberAltPhone || "");
  setFieldValue("Email Address", row.dataset.memberEmail || "");
  setFieldValue("Height", row.dataset.memberHeight || "");
  setFieldValue("Weight", row.dataset.memberWeight || "");
  setFieldValue("Gender", row.dataset.memberGender || "", "select");
  setFieldValue("Blood Group", row.dataset.memberBloodGroup || "", "select");
  setFieldValue("Address", row.dataset.memberAddress || "");
  
  if (addMemberDobInput) {
    addMemberDobInput.value = row.dataset.memberDob || "";
  }
  syncDateDisplay();

  // Prefill profile photo upload details in page 2 dynamically
  const previewImg = document.querySelector("[data-member-photo-preview]");
  const placeholderEl = document.querySelector(".photo-placeholder-icon");
  const memberPhotoUrl = row.dataset.memberPhotoUrl;
  if (previewImg && memberPhotoUrl) {
    previewImg.src = memberPhotoUrl;
    previewImg.hidden = false;
    if (placeholderEl) {
      placeholderEl.classList.add("is-hidden");
      placeholderEl.style.display = "none";
    }
    const circleEl = document.querySelector(".photo-preview-circle");
    if (circleEl) circleEl.classList.add("has-photo");
    const changePhotoBtn = document.querySelector("[data-photo-change-btn]");
    if (changePhotoBtn) changePhotoBtn.classList.add("is-visible");
  }
};

const checkIfMemberFormChanged = () => {
  if (memberFormMode !== "edit" || !activeMoreOptionsRow) {
    if (docUploadSaveButton) docUploadSaveButton.removeAttribute("disabled");
    return;
  }

  const nameVal = getFieldValue("Full Name");
  const phoneVal = getFieldValue("Contact Number");
  const altPhoneVal = getFieldValue("Alternate Contact");
  const emailVal = getFieldValue("Email Address");
  const dobVal = addMemberDobInput?.value || "";
  const heightVal = getFieldValue("Height");
  const weightVal = getFieldValue("Weight");
  const genderVal = getFieldValue("Gender", "select");
  const bloodGroupVal = getFieldValue("Blood Group", "select");
  const addressVal = getFieldValue("Address");

  const origName = activeMoreOptionsRow.dataset.memberName || "";
  const origPhone = activeMoreOptionsRow.dataset.memberPhone || "";
  const origAltPhone = activeMoreOptionsRow.dataset.memberAltPhone || "";
  const origEmail = activeMoreOptionsRow.dataset.memberEmail || "";
  const origDob = activeMoreOptionsRow.dataset.memberDob || "";
  const origHeight = activeMoreOptionsRow.dataset.memberHeight || "";
  const origWeight = activeMoreOptionsRow.dataset.memberWeight || "";
  const origGender = activeMoreOptionsRow.dataset.memberGender || "";
  const origBloodGroup = activeMoreOptionsRow.dataset.memberBloodGroup || "";
  const origAddress = activeMoreOptionsRow.dataset.memberAddress || "";

  const photoChanged = pendingMemberData && (
    pendingMemberData.photoUrl !== (activeMoreOptionsRow.dataset.memberPhotoUrl || "") ||
    pendingMemberData.photoBase64 !== (activeMoreOptionsRow.dataset.memberPhotoBase64 || "")
  );

  const docsChanged = uploadPreviewUrls.size > 0;

  const isChanged = (
    nameVal !== origName ||
    phoneVal !== origPhone ||
    altPhoneVal !== origAltPhone ||
    emailVal !== origEmail ||
    dobVal !== origDob ||
    heightVal !== origHeight ||
    weightVal !== origWeight ||
    genderVal !== origGender ||
    bloodGroupVal !== origBloodGroup ||
    addressVal !== origAddress ||
    photoChanged ||
    docsChanged
  );

  if (docUploadSaveButton) {
    if (isChanged) {
      docUploadSaveButton.removeAttribute("disabled");
    } else {
      docUploadSaveButton.setAttribute("disabled", "true");
    }
  }
};

const createMemberSearchIndex = (member) =>
  [
    member.name,
    member.contactNumber,
    member.alternateContact,
    member.email,
    member.dobDisplay,
    member.joiningDateDisplay,
    member.joiningTimeDisplay,
    member.gender,
    member.bloodGroup,
    member.height,
    member.weight,
    member.address,
    member.docsLabel
  ]
    .join(" ")
    .toLowerCase();

const adjustScrollPadding = () => {
  const scrollArea = document.querySelector(".dashboard-scroll-area");
  const contentSections = document.querySelector(".content-sections");
  const card4 = document.querySelector(".content-sections > .info-panel:last-child");
  if (scrollArea && contentSections && card4) {
    const centerOffset = Math.max(20, (scrollArea.clientHeight - 280) / 2);
    contentSections.style.paddingTop = `${centerOffset}px`;
    
    // Set sticky top dynamically for all panels
    const panels = Array.from(contentSections.querySelectorAll(".info-panel"));
    panels.forEach(p => p.style.top = `${centerOffset}px`);
    
    contentSections.style.paddingBottom = "0px";
    requestAnimationFrame(() => {
      // Temporarily set to static to measure natural unshifted offsetTop
      const originalPositions = panels.map(p => p.style.position);
      panels.forEach(p => p.style.position = "static");
      
      const maxScroll = card4.offsetTop - centerOffset;
      
      // Restore positions
      panels.forEach((p, idx) => p.style.position = originalPositions[idx]);
      
      const naturalHeight = contentSections.offsetHeight;
      const targetHeight = maxScroll + scrollArea.clientHeight;
      if (targetHeight > naturalHeight) {
        contentSections.style.paddingBottom = `${targetHeight - naturalHeight}px`;
      } else {
        contentSections.style.paddingBottom = "0px";
      }
    });
  }
};

const resetDashboardScroll = () => {
  const scrollArea = document.querySelector(".dashboard-scroll-area");
  if (scrollArea) {
    const originalScrollBehavior = scrollArea.style.scrollBehavior;
    const originalScrollSnapType = scrollArea.style.scrollSnapType;
    
    // Disable smooth scroll and snap behaviors to force instant reset
    scrollArea.style.scrollBehavior = "auto";
    scrollArea.style.scrollSnapType = "none";
    
    // Reset scroll position
    scrollArea.scrollTop = 0;
    
    // Force reflow
    void scrollArea.offsetHeight;
    
    // Restore original styles
    scrollArea.style.scrollBehavior = originalScrollBehavior;
    scrollArea.style.scrollSnapType = originalScrollSnapType;
  }
};

const setMoreOptionsModalState = (isOpen, triggerButton = null) => {
  const modal = document.getElementById("moreOptionsModal");
  const backdrop = document.getElementById("moreOptionsBackdrop");
  
  if (isOpen && triggerButton) {
    const row = triggerButton.closest("[data-member-card]");
    if (row) {
      activeMoreOptionsRow = row;
      const memberName = getMemberDisplayName(row);
      const memberImg = row.querySelector(".member-photo")?.src || "";
      
      // Luxury profile card (Fixed Left Side)
      const modalProfileImg = document.getElementById("modalProfileImg");
      if (modalProfileImg) modalProfileImg.src = memberImg;

      const modalMemberName = document.getElementById("modalMemberName");
      if (modalMemberName) modalMemberName.textContent = memberName;
      
      const joinDateEl = row.querySelector("[data-member-joined-date]");
      const fullJoinDate = joinDateEl?.textContent?.replace("Date", "").trim() || "";
      
      const modalJoinMonth = document.getElementById("modalJoinMonth");
      if (modalJoinMonth && fullJoinDate) {
        const dateParts = fullJoinDate.split(" ");
        if (dateParts.length >= 2) {
          modalJoinMonth.textContent = `${dateParts[1]} ${dateParts[2] || ""}`;
        }
      }
      
      const memberId = row.querySelector(".member-metrics")?.parentElement?.querySelector("b")?.nextSibling?.textContent?.trim() || `#${Math.floor(1000 + Math.random() * 9000)}`;
      const modalMemberId = document.getElementById("modalMemberId");
      if (modalMemberId) modalMemberId.textContent = memberId;

      // Setup Identity Card Download Button for Minimal Card
      const optDownloadBtn = document.querySelector("#moreOptionsModal .btn-card-bottom-download");
      setupCardDownloadButton(optDownloadBtn, memberName, memberImg);
      
      // NEW ENTERPRISE DASHBOARD ELEMENTS (Right Side)
      document.getElementById("dashMemberName").textContent = memberName;
      document.getElementById("dashMemberId").textContent = memberId;
      document.getElementById("dashJoinDate").textContent = fullJoinDate;
      document.getElementById("dashJoinDatePanel").textContent = fullJoinDate;
      
      // Personal section
      document.getElementById("dashFullName").textContent = memberName;
      
      const dobEl = row.querySelector("[data-member-dob]");
      document.getElementById("dashDOB").textContent = dobEl?.textContent?.replace("DOB", "").trim() || "-";
      
      const ageEl = row.querySelector("[data-member-age]");
      document.getElementById("dashAge").textContent = ageEl?.textContent?.replace("Age", "").trim() || "0 years";
      
      const heightEl = Array.from(row.querySelectorAll(".member-metrics span")).find(s => s.textContent.includes("Height"));
      document.getElementById("dashHeight").textContent = heightEl?.textContent?.replace("Height", "").trim() || "-";
      
      const weightEl = Array.from(row.querySelectorAll(".member-metrics span")).find(s => s.textContent.includes("Weight"));
      document.getElementById("dashWeight").textContent = weightEl?.textContent?.replace("Weight", "").trim() || "-";
      
      // Populate Gender and Blood Group dynamically
      document.getElementById("dashGender").textContent = row.dataset.memberGender || "-";
      document.getElementById("dashBloodGroup").textContent = row.dataset.memberBloodGroup || "-";
      
      // Contact section
      const primaryPhoneEl = Array.from(row.querySelectorAll(".member-stack span")).find(s => s.textContent.includes("Primary"));
      document.getElementById("dashPrimaryPhone").textContent = primaryPhoneEl?.textContent?.replace("Primary", "").trim() || "-";
      
      const altPhoneEl = Array.from(row.querySelectorAll(".member-stack span")).find(s => s.textContent.includes("Alternate"));
      document.getElementById("dashAltPhone").textContent = altPhoneEl?.textContent?.replace("Alternate", "").trim() || "-";
      
      const emailEl = Array.from(row.querySelectorAll(".member-stack span")).find(s => s.textContent.includes("Email"));
      document.getElementById("dashEmail").textContent = emailEl?.textContent?.replace("Email", "").trim() || "-";
      
      const addressEl = row.querySelector('[data-label="Address"]');
      document.getElementById("dashAddress").textContent = addressEl?.textContent?.trim() || "-";
      
      // Stats
      const docsLabel = row.dataset.memberDocsLabel || "0 Documents";
      document.getElementById("dashDocsCount").textContent = docsLabel.includes("Verified") ? "4 / 4" : "1 / 4";
    }

    backdrop?.classList.add("is-active");
    modal?.classList.add("is-active");
    document.body.style.overflow = "hidden";
    
    resetDashboardScroll();
    
    const scrollArea = document.querySelector(".dashboard-scroll-area");
    if (scrollArea) {
      const indicator = document.getElementById("dashboardScrollIndicator");
      if (indicator) {
        indicator.style.opacity = "1";
        setTimeout(() => {
          const maxScroll = scrollArea.scrollHeight - scrollArea.clientHeight;
          if (maxScroll <= 0) {
            indicator.style.opacity = "0";
          }
        }, 120);
      }
    }
    adjustScrollPadding();
  } else {
    backdrop?.classList.remove("is-active");
    modal?.classList.remove("is-active");
    document.body.style.overflow = "";
    resetDashboardScroll();
  }
};

const bindMemberRowInteractions = (row) => {
  const photoButton = row.querySelector("[data-photo-view]");
  const documentButton = row.querySelector(".doc-view-btn");
  const moreButton = row.querySelector(".member-more-btn");

  photoButton?.addEventListener("click", () => {
    const memberName = getMemberDisplayName(row);
    const memberImage = photoButton.querySelector("img");

    setDocumentModalContent({
      memberName,
      title: "Member's Photo",
      imageSrc: memberImage?.src || "",
      imageAlt: memberImage?.alt || memberName
    });

    setDocumentModalState(true, photoButton);
  });

  documentButton?.addEventListener("click", async (event) => {
    event.preventDefault();
    await initVerificationCenter(row, documentButton);
  });

  moreButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setMoreOptionsModalState(true, moreButton);
  });
};

// Modal Initialization
document.getElementById("closeMoreOptions")?.addEventListener("click", () => setMoreOptionsModalState(false));
document.getElementById("closeMoreOptionsBtn")?.addEventListener("click", () => setMoreOptionsModalState(false));
document.getElementById("moreOptionsBackdrop")?.addEventListener("click", () => setMoreOptionsModalState(false));

// Register scroll listener to fade out scroll indicator when user is actively scrolling, and restore it once scrolling stops
const initDashboardScrollIndicator = () => {
  const scrollArea = document.querySelector(".dashboard-scroll-area");
  const scrollIndicator = document.getElementById("dashboardScrollIndicator");
  let scrollTimeout;

  if (scrollArea && scrollIndicator) {
    scrollArea.addEventListener("scroll", () => {
      // Clear previous timeout so it doesn't fire during active scrolling
      clearTimeout(scrollTimeout);

      // Hide indicator immediately while scrolling
      scrollIndicator.style.opacity = "0";

      // Re-evaluate showing the indicator once scrolling has stopped for 200ms
      scrollTimeout = setTimeout(() => {
        const maxScroll = scrollArea.scrollHeight - scrollArea.clientHeight;
        if (maxScroll > 0) {
          const isAtBottom = maxScroll - scrollArea.scrollTop < 100;
          scrollIndicator.style.opacity = isAtBottom ? "0" : "1";
        } else {
          scrollIndicator.style.opacity = "0";
        }
      }, 200);
    });
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboardScrollIndicator);
} else {
  initDashboardScrollIndicator();
}

const initScrollLocking = () => {
  window.addEventListener("resize", adjustScrollPadding);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScrollLocking);
} else {
  initScrollLocking();
}

const initMembersScrollPerformance = () => {
  const scrollContainers = document.querySelectorAll(".members-stage, .past-members-stage");
  scrollContainers.forEach(container => {
    let scrollTimeout;
    container.addEventListener("scroll", () => {
      if (!container.classList.contains("is-scrolling")) {
        container.classList.add("is-scrolling");
      }
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        container.classList.remove("is-scrolling");
      }, 150);
    }, { passive: true });
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMembersScrollPerformance);
} else {
  initMembersScrollPerformance();
}

document.getElementById("viewDocumentsFromModal")?.addEventListener("click", async () => {
  if (activeMoreOptionsRow) {
    verificationModal?.classList.add("verification-animate-slide");
    
    // Use requestAnimationFrame twice to ensure the browser has rendered the modal at 100vh 
    // before we trigger the transition to -50%
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        await initVerificationCenter(activeMoreOptionsRow, document.getElementById("viewDocumentsFromModal"));
      });
    });
  }
});

document.getElementById("freezeMembershipFromModal")?.addEventListener("click", () => {
  setMoreOptionsModalState(false);
  setActiveView("freeze-pause");
});

document.getElementById("editMemberFromModal")?.addEventListener("click", () => {
  if (activeMoreOptionsRow) {
    memberFormMode = "edit";
    editingMemberId = activeMoreOptionsRow.dataset.memberId || null;
    
    // Prefill form fields
    prefillMemberForm(activeMoreOptionsRow);

    // Initialize pendingMemberData with existing details so we don't lose them if unchanged!
    pendingMemberData = {
      name: activeMoreOptionsRow.dataset.memberName || "",
      contactNumber: activeMoreOptionsRow.dataset.memberPhone || "",
      alternateContact: activeMoreOptionsRow.dataset.memberAltPhone || "",
      email: activeMoreOptionsRow.dataset.memberEmail || "",
      dobValue: activeMoreOptionsRow.dataset.memberDob || "",
      height: activeMoreOptionsRow.dataset.memberHeight || "",
      weight: activeMoreOptionsRow.dataset.memberWeight || "",
      gender: activeMoreOptionsRow.dataset.memberGender || "OTHER",
      bloodGroup: activeMoreOptionsRow.dataset.memberBloodGroup || "",
      address: activeMoreOptionsRow.dataset.memberAddress || "",
      photoUrl: activeMoreOptionsRow.dataset.memberPhotoUrl || "",
      photoBase64: activeMoreOptionsRow.dataset.memberPhotoBase64 || ""
    };
    
    // Update form titles
    document.getElementById("member-form-title").textContent = "Edit Member Details";
    const kicker = document.querySelector(".member-form-kicker");
    if (kicker) kicker.textContent = "Modify Registration";
    
    // Update button text to NEXT for Page 1
    const saveBtnSpan = addMemberSaveButton?.querySelector("span");
    const saveBtnSvg = addMemberSaveButton?.querySelector("svg");
    if (saveBtnSpan) saveBtnSpan.textContent = "NEXT";
    if (saveBtnSvg) saveBtnSvg.style.display = "";
    
    // Smoothly and animatedly open the Add Member Modal
    setAddMemberModalState(true, document.getElementById("editMemberFromModal"));

    // Check if form changed to update save button disabled state
    checkIfMemberFormChanged();
  }
});

const isNewRegistration = (member) => {
  let joinedDate = null;
  if (member.joinedAt) {
    joinedDate = new Date(member.joinedAt);
  } else if (member.joiningDateValue) {
    const time = member.joiningTimeValue || "00:00";
    const [year, month, day] = member.joiningDateValue.split("-").map(Number);
    const [hour, min] = time.split(":").map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      joinedDate = new Date(year, month - 1, day, hour, min);
    }
  }
  if (!joinedDate || isNaN(joinedDate.getTime())) return false;
  
  const now = new Date();
  const diffMs = now.getTime() - joinedDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours <= 24;
};

const renderDocsLabel = (label) => {
  if (!label || label === "No Documents") {
    return "No Documents";
  }
  const escaped = escapeHtml(label);
  return escaped.replace(/aadhaar card/gi, (match) => {
    const aadhaarPart = match.substring(0, match.length - 4).trim();
    const cardPart = match.substring(match.length - 4);
    return `${aadhaarPart}<br>${cardPart}`;
  });
};

const createMemberRow = (member) => {
  const row = document.createElement("tr");
  row.setAttribute("data-member-card", "");
  row.dataset.memberName = member.name;
  row.dataset.memberStatus = "verified";
  row.dataset.memberRecent = isNewRegistration(member) ? "true" : "false";
  row.dataset.memberPhone = member.contactNumber || "";
  row.dataset.memberAltPhone = member.alternateContact || "";
  row.dataset.memberEmail = member.email || "";
  row.dataset.memberDob = member.dobValue || "";
  row.dataset.memberHeight = member.height || "";
  row.dataset.memberWeight = member.weight || "";
  row.dataset.memberAddress = member.address || "";
  row.dataset.memberGender = member.gender || "OTHER";
  row.dataset.memberBloodGroup = member.bloodGroup || "";
  row.dataset.memberPhotoUrl = member.photoUrl || "";
  row.dataset.memberPhotoBase64 = member.photoBase64 || "";
  row.dataset.memberJoinedDateVal = member.joiningDateValue || "";
  row.dataset.memberJoinedTimeVal = member.joiningTimeValue || "";
  row.dataset.memberJoinedDateDisp = member.joiningDateDisplay || "";
  row.dataset.memberJoinedTimeDisp = member.joiningTimeDisplay || "";
  row.dataset.memberDocsLabel = member.docsLabel || "No Documents";
  row.dataset.search = createMemberSearchIndex(member);
  row.innerHTML = `
    <td data-label="Member">
      <button class="member-photo-btn" type="button" data-photo-view aria-label="View ${escapeHtml(member.name)} photo">
        <img class="member-photo" src="${escapeHtml(member.photoUrl)}" alt="${escapeHtml(member.name)}" />
      </button>
      <div class="member-name-cell">
        <strong>${escapeHtml(member.name)}</strong>
        ${isNewRegistration(member) ? '<span>New registration</span>' : ''}
      </div>
      <button class="member-more-btn" type="button" aria-label="More options">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>
    </td>
    <td data-label="Contact">
      <div class="member-stack">
        <span><b>Primary</b> ${escapeHtml(member.contactNumber)}</span>
        <span><b>Alternate</b> ${escapeHtml(member.alternateContact)}</span>
        <span><b>Email</b> ${escapeHtml(member.email || "Not provided")}</span>
      </div>
    </td>
    <td data-label="Personal">
      <div class="member-metrics">
        <span data-member-dob="${escapeHtml(member.dobValue)}"><b>DOB</b> ${escapeHtml(member.dobDisplay)}</span>
        <span data-member-age><b>Age</b></span>
        <span><b>Height</b> ${escapeHtml(member.height || "-")}</span>
        <span><b>Weight</b> ${escapeHtml(member.weight || "-")}</span>
      </div>
    </td>
    <td data-label="Joined">
      <div class="member-metrics">
        <span data-member-joined-date="${escapeHtml(member.joiningDateValue)}"><b>Date</b> ${escapeHtml(member.joiningDateDisplay)}</span>
        <span data-member-joined-time="${escapeHtml(member.joiningTimeValue)}"><b>Time</b> ${escapeHtml(member.joiningTimeDisplay)}</span>
      </div>
    </td>
    <td data-label="Address">${escapeHtml(member.address)}</td>
    <td data-label="Documents">
      <div class="doc-cell">
        <span>${renderDocsLabel(member.docsLabel)}</span>
        <button class="doc-view-btn" type="button">View Document</button>
      </div>
    </td>
  `;
  bindMemberRowInteractions(row);
  return row;
};

const updateMemberRowInPlace = (row, updatedMember) => {
  if (!row) return;

  const memberId = row.dataset.memberId;
  if (memberId) {
    const idx = cachedMembers.findIndex(m => m.id === memberId);
    if (idx !== -1) {
      cachedMembers[idx].full_name = updatedMember.name;
      cachedMembers[idx].phone = updatedMember.contactNumber;
      cachedMembers[idx].alternate_phone = updatedMember.alternateContact || null;
      cachedMembers[idx].email = updatedMember.email || null;
      cachedMembers[idx].dob = updatedMember.dobValue || null;
      cachedMembers[idx].address = updatedMember.address || null;
      cachedMembers[idx].height = updatedMember.height || null;
      cachedMembers[idx].weight = updatedMember.weight || null;
      cachedMembers[idx].gender = updatedMember.gender || "OTHER";
      cachedMembers[idx].blood_group = updatedMember.bloodGroup || null;
      if (updatedMember.photoBase64) {
        cachedMembers[idx].profile_photo_path = updatedMember.photoBase64;
      } else if (updatedMember.photoUrl) {
        cachedMembers[idx].profile_photo_path = updatedMember.photoUrl;
      }
    }
  }

  row.dataset.memberName = updatedMember.name;
  row.dataset.memberPhone = updatedMember.contactNumber || "";
  row.dataset.memberAltPhone = updatedMember.alternateContact || "";
  row.dataset.memberEmail = updatedMember.email || "";
  row.dataset.memberDob = updatedMember.dobValue || "";
  row.dataset.memberHeight = updatedMember.height || "";
  row.dataset.memberWeight = updatedMember.weight || "";
  row.dataset.memberAddress = updatedMember.address || "";
  row.dataset.memberGender = updatedMember.gender || "OTHER";
  row.dataset.memberBloodGroup = updatedMember.bloodGroup || "";
  row.dataset.memberPhotoUrl = updatedMember.photoUrl || "";
  row.dataset.memberPhotoBase64 = updatedMember.photoBase64 || "";
  row.dataset.memberDocsLabel = updatedMember.docsLabel || "No Documents";
  row.dataset.search = createMemberSearchIndex(updatedMember);
  row.dataset.memberRecent = isNewRegistration(updatedMember) ? "true" : "false";

  row.innerHTML = `
    <td data-label="Member">
      <button class="member-photo-btn" type="button" data-photo-view aria-label="View ${escapeHtml(updatedMember.name)} photo">
        <img class="member-photo" src="${escapeHtml(updatedMember.photoUrl)}" alt="${escapeHtml(updatedMember.name)}" />
      </button>
      <div class="member-name-cell">
        <strong>${escapeHtml(updatedMember.name)}</strong>
        ${isNewRegistration(updatedMember) ? '<span>New registration</span>' : ''}
      </div>
      <button class="member-more-btn" type="button" aria-label="More options">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>
    </td>
    <td data-label="Contact">
      <div class="member-stack">
        <span><b>Primary</b> ${escapeHtml(updatedMember.contactNumber)}</span>
        <span><b>Alternate</b> ${escapeHtml(updatedMember.alternateContact)}</span>
        <span><b>Email</b> ${escapeHtml(updatedMember.email || "Not provided")}</span>
      </div>
    </td>
    <td data-label="Personal">
      <div class="member-metrics">
        <span data-member-dob="${escapeHtml(updatedMember.dobValue)}"><b>DOB</b> ${escapeHtml(updatedMember.dobDisplay)}</span>
        <span data-member-age><b>Age</b></span>
        <span><b>Height</b> ${escapeHtml(updatedMember.height || "-")}</span>
        <span><b>Weight</b> ${escapeHtml(updatedMember.weight || "-")}</span>
      </div>
    </td>
    <td data-label="Joined">
      <div class="member-metrics">
        <span data-member-joined-date="${escapeHtml(updatedMember.joiningDateValue)}"><b>Date</b> ${escapeHtml(updatedMember.joiningDateDisplay)}</span>
        <span data-member-joined-time="${escapeHtml(updatedMember.joiningTimeValue)}"><b>Time</b> ${escapeHtml(updatedMember.joiningTimeDisplay)}</span>
      </div>
    </td>
    <td data-label="Address">${escapeHtml(updatedMember.address)}</td>
    <td data-label="Documents">
      <div class="doc-cell">
        <span>${renderDocsLabel(updatedMember.docsLabel)}</span>
        <button class="doc-view-btn" type="button">View Document</button>
      </div>
    </td>
  `;

  bindMemberRowInteractions(row);
  updateMemberAges();
  updateMemberStats();
};

const getNewMemberPayload = () => {
  const joinedAt = new Date();
  const fullName = getFieldValue("Full Name");
  const contactNumber = getFieldValue("Contact Number");
  const alternateContact = getFieldValue("Alternate Contact");
  const email = getFieldValue("Email Address");
  const dobValue = addMemberDobInput?.value || "";

  // Preserve previously uploaded profile photo in this session
  const photoUrl = pendingMemberData?.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName || "GymDeckMember")}`;
  const photoBase64 = pendingMemberData?.photoBase64 || null;

  return {
    name: fullName,
    contactNumber,
    alternateContact,
    email,
    dobValue,
    dobDisplay: formatDisplayDate(dobValue),
    height: getFieldValue("Height"),
    weight: getFieldValue("Weight"),
    gender: getFieldValue("Gender", "select"),
    bloodGroup: getFieldValue("Blood Group", "select"),
    address: getFieldValue("Address"),
    docsLabel: "No Documents",
    joiningDateValue: formatJoinDateValue(joinedAt),
    joiningTimeValue: formatJoinTimeValue(joinedAt),
    joiningDateDisplay: formatJoinDateDisplay(joinedAt),
    joiningTimeDisplay: formatJoinTimeDisplay(joinedAt),
    photoUrl,
    photoBase64,
    joinedAt: joinedAt.toISOString()
  };
};

const syncDateDisplay = () => {
  const selectedDate = parseCalendarValue(addMemberDobInput?.value || "");

  if (!selectedDate || !addMemberDobDisplay) {
    if (addMemberDobDisplay) {
      addMemberDobDisplay.value = "";
    }
    return;
  }

  addMemberDobDisplay.value = formatCalendarDate(selectedDate);
};

const renderDatePicker = () => {
  if (!addMemberDatePickerGrid || !addMemberDatePickerMonth || !addMemberDatePickerYears) {
    return;
  }

  const visibleYear = activeCalendarDate.getFullYear();
  const visibleMonth = activeCalendarDate.getMonth();
  const monthStart = new Date(visibleYear, visibleMonth, 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const selectedValue = addMemberDobInput?.value || "";
  const todayValue = formatCalendarValue(new Date());

  addMemberDatePickerMonth.textContent = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(monthStart);

  addMemberDatePickerGrid.hidden = datePickerMode === "year";
  const weekdays = addMemberDatePickerGrid.previousElementSibling;

  if (weekdays) {
    weekdays.hidden = datePickerMode === "year";
  }

  addMemberDatePickerYears.hidden = datePickerMode !== "year";
  addMemberDatePickerGrid.innerHTML = "";
  addMemberDatePickerYears.innerHTML = "";

  if (datePickerMode === "year") {
    const selectedDate = parseCalendarValue(selectedValue);
    const selectedYear = selectedDate?.getFullYear() ?? visibleYear;
    const currentYear = new Date().getFullYear();
    const baseYear = visibleYear - 7;

    Array.from({ length: 16 }).forEach((_, index) => {
      const year = baseYear + index;
      const yearButton = document.createElement("button");

      yearButton.type = "button";
      yearButton.className = "date-picker-year";
      yearButton.textContent = String(year);

      if (year === currentYear) {
        yearButton.classList.add("is-current");
      }

      if (year === selectedYear) {
        yearButton.classList.add("is-selected");
      }

      yearButton.addEventListener("click", () => {
        activeCalendarDate = new Date(year, activeCalendarDate.getMonth(), 1);
        datePickerMode = "day";
        renderDatePicker();
      });

      addMemberDatePickerYears.append(yearButton);
    });

    return;
  }

  Array.from({ length: 42 }).forEach((_, index) => {
    const dayDate = new Date(gridStart);
    dayDate.setDate(gridStart.getDate() + index);
    const dayValue = formatCalendarValue(dayDate);
    const dayButton = document.createElement("button");
    const isMuted = dayDate.getMonth() !== visibleMonth;

    dayButton.type = "button";
    dayButton.className = "date-picker-day";
    dayButton.textContent = String(dayDate.getDate());
    dayButton.dataset.dateValue = dayValue;

    if (isMuted) {
      dayButton.classList.add("is-muted");
    }

    if (dayValue === todayValue) {
      dayButton.classList.add("is-today");
    }

    if (dayValue === selectedValue) {
      dayButton.classList.add("is-selected");
    }

    dayButton.addEventListener("click", () => {
      if (addMemberDobInput) {
        addMemberDobInput.value = dayValue;
      }

      syncDateDisplay();
      renderDatePicker();
      closeDatePicker();
    });

    addMemberDatePickerGrid.append(dayButton);
  });
};

const validateMemberForm = () => {
  const errors = [];

  getMemberFormFields().forEach((field) => {
    const input = field.querySelector("input:not([type='hidden']), textarea");
    const hiddenInput = field.querySelector("input[type='hidden']");
    const label = field.dataset.fieldLabel || "This field";
    let message = "";

    if (field.contains(addMemberDobDisplay) && !addMemberDobInput?.value) {
      message = "Please select the member's date of birth.";
    } else if (input?.required && !input.value.trim()) {
      message = `Please fill in ${label.toLowerCase()}.`;
    } else if (input?.type === "email" && input.value.trim() && !input.checkValidity()) {
      message = "Please enter a valid email address.";
    } else if (hiddenInput?.required && !hiddenInput.value.trim()) {
      message = `Please fill in ${label.toLowerCase()}.`;
    }

    setFieldErrorState(field, message);

    if (message) {
      errors.push({ field, input, label, message });
    }
  });

  return errors;
};


const setupCardDownloadButton = (btn, memberName, imageSrc = "") => {
  if (!btn) return;

  // Clone to remove old listeners
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", async () => {
    if (newBtn.classList.contains("is-loading")) return;

    // Force show tooltip message
    const container = newBtn.closest(".download-btn-container");
    container?.classList.add("force-show");
    setTimeout(() => container?.classList.remove("force-show"), 1500);

    // 1. Start Animation
    newBtn.classList.add("is-loading");

    try {
      // 2. Perform Download
      let portraitSrc = imageSrc;
      if (!portraitSrc) {
        const modal = newBtn.closest(".luxury-profile-card");
        const img = modal?.querySelector(".card-portrait");
        portraitSrc = img?.src || "";
      }

      if (portraitSrc) {
        const cleanName = (memberName || "GymDeck").replace(/\s+/g, '_');
        const filename = `${cleanName}_Identity_Card.png`;

        if (window.__TAURI__) {
          let base64Data = "";
          if (portraitSrc.startsWith("data:")) {
            base64Data = portraitSrc;
          } else {
            const response = await fetch(portraitSrc);
            const blob = await response.blob();
            base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }

          await window.__TAURI__.core.invoke("download_document_command", {
            filename,
            base64Data
          });
        } else {
          const response = await fetch(portraitSrc);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }

        showToast("Identity card saved successfully!");
      }

      // 3. Success State
      setTimeout(() => {
        newBtn.classList.remove("is-loading");
        newBtn.classList.add("is-success");

        const successIcon = newBtn.querySelector(".icon-wrap-success");
        if (successIcon) {
          successIcon.removeAttribute("hidden");
        }

        setTimeout(() => {
          newBtn.classList.remove("is-success");
          if (successIcon) {
            successIcon.setAttribute("hidden", "");
          }
        }, 2000);
      }, 500);

    } catch (err) {
      newBtn.classList.remove("is-loading");
      if (err && err.toString().includes("Download cancelled")) {
        return;
      }
      console.error("Card download failed:", err);
      showToast("Failed to save identity card.");
    }
  });
};

const setDocumentModalContent = ({ memberName, title, imageSrc = "", imageAlt = "" }) => {
  if (documentMemberLabel) {
    documentMemberLabel.textContent = memberName || "Member Record";
  }

  const joinedLabel = document.querySelector("[data-document-joined]");
  const idLabel = document.querySelector("[data-document-id]");

  if (joinedLabel) {
    joinedLabel.textContent = "May 2026";
  }
  if (idLabel) {
    idLabel.textContent = "#" + (Math.floor(Math.random() * 9000) + 1000);
  }

  const finalPortraitSrc = imageSrc || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(memberName || "GymDeck")}`;
  
  if (documentImage) {
    documentImage.src = finalPortraitSrc;
    documentImage.alt = imageAlt || title || memberName || "Portrait";
  }

  // Handle Download Logic specifically for the Document modal instance
  const documentModalDownloadBtn = document.querySelector(".document-modal .btn-card-bottom-download");
  setupCardDownloadButton(documentModalDownloadBtn, memberName, finalPortraitSrc);
};

const performLogout = async () => {
  if (window.__TAURI__) {
    try {
      await window.__TAURI__.core.invoke("logout_command");
    } catch (e) {
      console.error("Failed to revoke native session:", e);
    }
  }
  sessionStorage.removeItem(authStorageKey);
  localStorage.removeItem(authStorageKey);
  sessionStorage.setItem("gymdeck-enter", "logout");
  document.body.classList.remove("logout-dialog-open");
  document.body.classList.add("is-logging-out");

  if (logoutDialog) {
    logoutDialog.hidden = true;
  }

  if (logoutBackdrop) {
    logoutBackdrop.hidden = true;
  }

  window.setTimeout(() => {
    window.location.href = logoutDestination;
  }, 100);
};

const stageAliases = {
  "attendance": "daily-checkin",
  "account": "profile",
  "documents": "member-documents",
  "leads-prospects": "coming-soon",
};

const stageVisibilityConfig = [
  { key: "dashboard", el: () => dashboardStage },
  { key: "members", el: () => membersStage },
  { key: "membership-plans", el: () => DOM.membershipPlansStage },
  { key: "expiring-memberships", el: () => DOM.expiringMembershipsStage },
  { key: "freeze-pause", el: () => DOM.freezePauseStage },
  { key: "daily-checkin", el: () => DOM.dailyCheckinStage },
  { key: "manual-entry", el: () => DOM.manualEntryStage },
  { key: "attendance-reports", el: () => DOM.attendanceReportsStage },
  { key: "payments", el: () => DOM.paymentsStage },
  { key: "pending-dues", el: () => DOM.pendingDuesStage },
  { key: "payment-history", el: () => DOM.paymentHistoryStage },
  { key: "generate-receipt", el: () => DOM.generateReceiptStage },
  { key: "renew-membership", el: () => DOM.renewMembershipStage },
  { key: "trainers", el: () => DOM.trainersStage },
  { key: "assign-trainer", el: () => DOM.assignTrainerStage },
  { key: "trainer-schedule", el: () => DOM.trainerScheduleStage },
  { key: "staff-roles", el: () => DOM.staffRolesStage },
  { key: "personal-training", el: () => DOM.ptClientsStage },
  { key: "pt-packages", el: () => DOM.ptPackagesStage },
  { key: "session-tracking", el: () => DOM.sessionTrackingStage },
  { key: "trainer-earnings", el: () => DOM.trainerEarningsStage },
  { key: "notify-members", el: () => DOM.notifyMembersStage },
  { key: "revenue-reports", el: () => DOM.revenueReportsStage },
  { key: "attendance-analytics", el: () => DOM.attendanceAnalyticsStage },
  { key: "member-growth", el: () => DOM.memberGrowthStage },
  { key: "trainer-performance", el: () => DOM.trainerPerformanceStage },
  { key: "gym-profile", el: () => DOM.gymProfileStage },
  { key: "app-settings", el: () => DOM.appSettingsStage },
  { key: "backup-restore", el: () => DOM.backupRestoreStage },
  { key: "sync-status", el: () => DOM.syncStatusStage },
  { key: "profile", el: () => DOM.profileStage },
  { key: "member-documents", el: () => DOM.memberDocumentsStage },
  { key: "id-proofs", el: () => DOM.idProofsStage },
  { key: "agreements", el: () => DOM.agreementsStage },
  { key: "past-members", el: () => DOM.pastMembersStage },
  { key: "coming-soon", el: () => comingSoonStage },
];

const stageVisibilityKeys = new Set(stageVisibilityConfig.map(c => c.key));
stageVisibilityKeys.add("dashboard");
stageVisibilityKeys.add("members");

const setStageVisibility = (activeStage) => {
  const isDashboard = activeStage === "dashboard";
  const isMembers = activeStage === "members";

  dashboardStage?.classList.toggle("is-hidden", !isDashboard);
  dashboardStage?.setAttribute("aria-hidden", String(!isDashboard));

  membersStage?.classList.toggle("is-active", isMembers);
  membersStage?.setAttribute("aria-hidden", String(!isMembers));

  for (const { key, el } of stageVisibilityConfig) {
    const element = el();
    if (!element) continue;
    const match = key === activeStage;
    element.classList.toggle("is-active", match);
    element.setAttribute("aria-hidden", String(!match));
  }
};

const calculateAge = (dobValue) => {
  if (!dobValue) {
    return "";
  }

  const dob = new Date(dobValue);

  if (Number.isNaN(dob.getTime())) {
    return "";
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  const dayDifference = today.getDate() - dob.getDate();

  if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) {
    age -= 1;
  }

  return `${age} years`;
};

const updateMemberAges = () => {
  getMemberDobCells().forEach((dobCell) => {
    const ageCell = dobCell.nextElementSibling;

    if (!ageCell?.hasAttribute("data-member-age")) {
      return;
    }

    const age = calculateAge(dobCell.dataset.memberDob);
    const label = document.createElement("b");
    label.textContent = "Age";
    ageCell.replaceChildren(label, document.createTextNode(age ? ` ${age}` : ""));
  });
};


const renderPaginationControls = (totalMatches) => {
  if (!paginationContainer || !paginationNumbers) return;

  const totalPages = Math.ceil(totalMatches / MEMBERS_PER_PAGE);

  if (totalPages <= 1) {
    paginationContainer.style.display = "none";
    return;
  }

  paginationContainer.style.display = "flex";
  paginationNumbers.innerHTML = "";

  // Generate page numbers
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `page-number ${i === currentMembersPage ? "is-active" : ""}`;
    btn.textContent = i;
    btn.type = "button";
    btn.addEventListener("click", () => {
      currentMembersPage = i;
      updateMemberResults(false); // don't reset page
      const membersStage = document.querySelector(".members-stage");
      if (membersStage) membersStage.scrollTop = 0;
      const membersTableWrap = document.querySelector(".members-table-wrap");
      if (membersTableWrap) membersTableWrap.scrollTop = 0;
    });
    paginationNumbers.appendChild(btn);
  }

  // Update Prev/Next buttons
  if (paginationPrev) paginationPrev.disabled = currentMembersPage === 1;
  if (paginationNext) paginationNext.disabled = currentMembersPage === totalPages;
};

const updateMemberResults = (resetToFirstPage = true) => {
  if (resetToFirstPage) {
    currentMembersPage = 1;
  }
  renderCurrentMemberPage();
};

if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    if (memberSearchInput) {
      memberSearchInput.value = "";
    }
    activeMemberFilter = "all";
    memberFilterButtons.forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.memberFilter === "all");
    });
    updateMemberResults();
  });
}

const setActiveView = (viewName) => {
  console.log(`GymDeck: Switching to view: ${viewName}`);
  const isCompactNavigation = window.matchMedia("(max-width: 1180px)").matches;
  const safeView = viewLabels[viewName] ? viewName : "dashboard";
  if (activeView === safeView && activeRoots.has(safeView)) return;
  
  activeView = safeView;
  console.log(`GymDeck: Active roots before mount:`, Array.from(activeRoots.keys()));

  // Lazy mount the required stage
  mountStageLazy(safeView);  
  // Unmount other heavy stages to free up memory
  unmountInactiveStages(safeView);

  const allSidebarLinks = Array.from(sidebar?.querySelectorAll("[data-view]") || []);
  allSidebarLinks.forEach((link) => {
    const isActive = link.dataset.view === safeView;
    link.classList.toggle("active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  navDropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector("[data-nav-dropdown-toggle]");
    const hasActiveView = Boolean(dropdown.querySelector(`[data-view="${safeView}"]`));
    const shouldStayOpen = !isCompactNavigation && hasActiveView;

    // Standardize all classes and attributes for uniform behavior
    dropdown.classList.toggle("has-active-view", hasActiveView);
    dropdown.classList.toggle("is-open", shouldStayOpen);
    
    toggle?.classList.toggle("active", hasActiveView);
    toggle?.setAttribute("aria-expanded", String(shouldStayOpen));
  });

  if (comingSoonFeature) {
    comingSoonFeature.textContent = viewLabels[safeView] || "Workspace";
  }

  const activeStage = stageAliases[safeView] || safeView;
  setStageVisibility(activeStage);
  if (safeView === "members") {
    loadMembersFromBackend().then(() => updateMemberResults());
  }

  if (isCompactNavigation) {
    setMenuState(false);
  }

  refreshSidebarScrollIndicator();
};

const getDeletedMemberIds = () => {
  try {
    const serialized = window.localStorage.getItem(MEMBER_DELETED_STORAGE_KEY);
    return serialized ? new Set(JSON.parse(serialized)) : new Set();
  } catch {
    return new Set();
  }
};

const hideDeletedMembersInAllViews = (resetPage = false) => {
  const shouldReset = typeof resetPage === "boolean" ? resetPage : false;
  const deletedIds = getDeletedMemberIds();

  cachedMembers = cachedMembers.filter(m => !deletedIds.has(m.id));

  if (shouldReset) {
    currentMembersPage = 1;
  }
  renderCurrentMemberPage();
};

const mapBackendMember = (m) => ({
  name: m.full_name,
  contactNumber: m.phone,
  alternateContact: m.alternate_phone || "",
  email: m.email || "",
  dobValue: m.dob || "",
  dobDisplay: formatDisplayDate(m.dob),
  height: m.height || "",
  weight: m.weight || "",
  gender: m.gender || "OTHER",
  bloodGroup: m.blood_group || "",
  address: m.address || "",
  docsLabel: m.notes || "",
  joiningDateValue: m.joined_at ? m.joined_at.split('T')[0] : "",
  joiningTimeValue: m.joined_at ? (m.joined_at.split('T')[1]?.slice(0, 5) || "00:00") : "00:00",
  joiningDateDisplay: m.joined_at ? formatJoinDateDisplay(new Date(m.joined_at)) : "",
  joiningTimeDisplay: m.joined_at ? formatJoinTimeDisplay(new Date(m.joined_at)) : "",
  photoUrl: m.profile_photo_path || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.full_name || "GymDeckMember")}`,
  photoBase64: (m.profile_photo_path && m.profile_photo_path.startsWith("data:")) ? m.profile_photo_path : "",
  joinedAt: m.joined_at
});

const renderCurrentMemberPage = () => {
  if (!membersTableBody) return;

  const totalFiltered = getFilteredMemberCount();
  const totalPages = Math.max(1, Math.ceil(totalFiltered / MEMBERS_PER_PAGE));
  currentMembersPage = Math.max(1, Math.min(currentMembersPage, totalPages));

  const start = (currentMembersPage - 1) * MEMBERS_PER_PAGE;
  const end = start + MEMBERS_PER_PAGE;

  const pageMembers = [];
  let idx = 0;
  for (const m of cachedMembers) {
    const card = mapBackendMember(m);
    const searchContent = createMemberSearchIndex(card);
    const query = memberSearchInput?.value.trim().toLowerCase() || "";
    const matchesSearch = !query || searchContent.includes(query);
    const matchesFilter = matchesMemberFilterRaw(m);
    if (matchesSearch && matchesFilter) {
      if (idx >= start && idx < end) {
        pageMembers.push({ member: m, card });
      }
      idx++;
    }
  }

  membersTableBody.innerHTML = "";
  if (pageMembers.length === 0 && cachedMembers.length === 0) {
    if (membersEmptyState) {
      membersEmptyState.hidden = false;
      if (emptyTitle) emptyTitle.textContent = "Your directory is empty";
      if (emptyText) emptyText.textContent = "It looks like there are no members in your directory yet. Start by adding a new member to your gym.";
      if (clearSearchBtn) clearSearchBtn.hidden = true;
    }
    if (paginationContainer) paginationContainer.style.display = "none";
    if (memberCount) memberCount.textContent = "0 profiles";
    return;
  }
  if (pageMembers.length === 0) {
    if (membersEmptyState) {
      membersEmptyState.hidden = false;
      const query = memberSearchInput?.value.trim().toLowerCase() || "";
      if (emptyTitle) emptyTitle.textContent = "No members found";
      if (emptyText) emptyText.textContent = query
        ? `We couldn't find any members matching "${query}". Try a different search term.`
        : "No members match the selected filter.";
      if (clearSearchBtn) clearSearchBtn.hidden = !query && activeMemberFilter === "all";
    }
    if (paginationContainer) paginationContainer.style.display = "none";
    if (memberCount) memberCount.textContent = "0 profiles";
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const { member: m, card: frontendMember } of pageMembers) {
    const row = createMemberRow(frontendMember);
    row.dataset.memberId = m.id;
    row.dataset.rawMember = JSON.stringify(m);
    fragment.appendChild(row);
  }
  membersTableBody.appendChild(fragment);

  if (membersEmptyState) membersEmptyState.hidden = true;
  if (paginationContainer) paginationContainer.style.display = totalPages > 1 ? "flex" : "none";
  updateMemberAges();
  updateMemberStats();
  renderPaginationControls(totalFiltered);
  updateMemberCountDisplay(totalFiltered);
};

const matchesMemberFilterRaw = (m) => {
  if (activeMemberFilter === "all") return true;
  if (activeMemberFilter === "verified") return true;
  if (activeMemberFilter === "recent") {
    if (!m.joined_at) return false;
    const joined = new Date(m.joined_at);
    const diffMs = Date.now() - joined.getTime();
    return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;
  }
  return true;
};

const getFilteredMemberCount = () => {
  let count = 0;
  for (const m of cachedMembers) {
    const card = mapBackendMember(m);
    const searchContent = createMemberSearchIndex(card);
    const query = memberSearchInput?.value.trim().toLowerCase() || "";
    const matchesSearch = !query || searchContent.includes(query);
    const matchesFilter = matchesMemberFilterRaw(m);
    if (matchesSearch && matchesFilter) count++;
  }
  return count;
};

const updateMemberCountDisplay = (count) => {
  if (memberCount) {
    memberCount.textContent = `${count} ${count === 1 ? "profile" : "profiles"}`;
  }
};

const loadMembersFromBackend = async (resetPage = true) => {
  if (!window.__TAURI__) return;

  try {
    const members = await window.__TAURI__.core.invoke("get_members_command", { limit: 5000, offset: 0 });
    console.log(`GymDeck: Loaded ${members.length} members from backend.`);
    cachedMembers = members;

    if (resetPage) {
      currentMembersPage = 1;
    }

    renderCurrentMemberPage();

    if (members.length === 0 && !memberSearchInput?.value && activeMemberFilter === "all") {
      if (membersEmptyState) {
        membersEmptyState.hidden = false;
        if (emptyTitle) emptyTitle.textContent = "Your directory is empty";
        if (emptyText) emptyText.textContent = "It looks like there are no members in your directory yet. Start by adding a new member to your gym.";
        if (clearSearchBtn) clearSearchBtn.hidden = true;
      }
      if (paginationContainer) paginationContainer.style.display = "none";
      if (memberCount) memberCount.textContent = "0 profiles";
    }
  } catch (err) {
    console.error("GymDeck: Error loading members from database:", err);
    if (err && (String(err).includes("Session Error") || String(err).includes("Session expired"))) {
      sessionStorage.removeItem("gymdeck-authenticated");
      localStorage.removeItem("gymdeck-authenticated");
      window.location.replace("../index.html");
    }
  }
};

window.addEventListener("gymdeck-member-deleted", hideDeletedMembersInAllViews);

menuToggle?.addEventListener("click", () => {
  const isOpen = document.body.classList.contains("sidebar-open");
  setMenuState(!isOpen);
  refreshSidebarScrollIndicator();
});

sidebarOverlay?.addEventListener("click", () => {
  setMenuState(false);
  refreshSidebarScrollIndicator();
});

sidebarMenuScroll?.addEventListener("scroll", () => {
  revealSidebarScrollIndicator();
  scheduleSidebarScrollIndicatorSync();
}, { passive: true });
window.addEventListener("resize", refreshSidebarScrollIndicator);

sidebar?.addEventListener("mouseenter", () => {
  setSidebarRailExpanded(true);
});

sidebar?.addEventListener("mouseleave", () => {
  if (!sidebar.matches(":focus-within")) {
    setSidebarRailExpanded(false);
  }
});

sidebar?.addEventListener("focusin", () => {
  setSidebarRailExpanded(true);
});

sidebar?.addEventListener("focusout", (event) => {
  if (!sidebar.contains(event.relatedTarget)) {
    setSidebarRailExpanded(sidebar.matches(":hover"));
  }
});

if (window.ResizeObserver && sidebarMenuScroll && sidebarScrollIndicator) {
  const sidebarScrollObserver = new ResizeObserver(refreshSidebarScrollIndicator);
  sidebarScrollObserver.observe(sidebarMenuScroll);
  sidebarScrollObserver.observe(sidebarScrollIndicator);
}

navDropdownToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const dropdown = toggle.closest("[data-nav-dropdown]");
    const isOpen = !dropdown?.classList.contains("is-open");

    // Exclusive Accordion Logic: Close all other open dropdowns first
    navDropdowns.forEach((currentDropdown) => {
      if (currentDropdown !== dropdown) {
        currentDropdown.classList.remove("is-open");
        currentDropdown.querySelector("[data-nav-dropdown-toggle]")?.setAttribute("aria-expanded", "false");
      }
    });

    // Toggle the clicked dropdown
    dropdown?.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    refreshSidebarScrollIndicator();
  });
});

logoutTrigger?.addEventListener("click", (event) => {
  event.preventDefault();
  setMenuState(false);
  setLogoutDialogState(true);
});

logoutBackdrop?.addEventListener("click", () => {
  setLogoutDialogState(false);
});

logoutCancel?.addEventListener("click", () => {
  setLogoutDialogState(false);
});

logoutConfirm?.addEventListener("click", () => {
  performLogout();
});


verificationCloseButton?.addEventListener("click", () => {
  setVerificationModalState(false);
});

verificationBackdrop?.addEventListener("click", () => {
  setVerificationModalState(false);
});

// ESC Key Listener for all modals consolidated below in the script initialization section

getDocumentViewButtons().forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    const row = button.closest("tr");
    if (row) await initVerificationCenter(row, button);
  });
});

photoViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const row = button.closest("tr");
    const memberName = getMemberDisplayName(row);
    const memberImage = button.querySelector("img");

    setDocumentModalContent({
      memberName,
      title: "Member Photo",
      imageSrc: memberImage?.src || "",
      imageAlt: memberImage?.alt || memberName
    });

    setDocumentModalState(true, button);
  });
});

documentModalBackdrop?.addEventListener("click", () => {
  setDocumentModalState(false);
});

documentCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDocumentModalState(false);
  });
});

addMemberOpenButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveView("members");
    
    // Clear verification context so it doesn't leak into new member creation
    activeVerificationMemberId = null;
    activeVerificationMemberName = "";
    pendingMemberData = null;
    
    memberFormMode = "add";
    editingMemberId = null;
    document.getElementById("member-form-title").textContent = "Add New Member";
    const kicker = document.querySelector(".member-form-kicker");
    if (kicker) kicker.textContent = "New Registration";

    const saveBtnSpan = addMemberSaveButton?.querySelector("span");
    const saveBtnSvg = addMemberSaveButton?.querySelector("svg");
    if (saveBtnSpan) saveBtnSpan.textContent = "NEXT";
    if (saveBtnSvg) saveBtnSvg.style.display = "";
    
    resetMemberForm();
    clearMemberFormErrors();
    setAddMemberModalState(true, button);
  });
});

addMemberBackdrop?.addEventListener("click", () => {
  const prevMemberId = activeVerificationMemberId;
  const isVerificationOpen = document.body.classList.contains("verification-modal-open");
  setAddMemberModalState(false);
  if (prevMemberId && isVerificationOpen) {
    const row = document.querySelector(`[data-member-card][data-member-id="${prevMemberId}"]`);
    if (row) {
      initVerificationCenter(row, lastDocumentTrigger);
    }
  }
});

// Member photo upload selectors
const photoUploadInput = document.querySelector("[data-member-photo-input]");
const photoUploadPreview = document.querySelector("[data-member-photo-preview]");
const photoPlaceholder = document.querySelector(".photo-placeholder-icon");
const photoUploadTriggers = Array.from(document.querySelectorAll("[data-member-photo-trigger]"));
const photoUploadBackButton = document.querySelector("[data-photo-upload-back]");
const photoUploadNextButton = document.querySelector("[data-photo-upload-next]");

photoUploadTriggers.forEach(trigger => {
    trigger.addEventListener("click", (e) => {
        // If a photo is already uploaded, the circle should not be clickable (only data-photo-change-btn is allowed)
        const hasPhoto = photoUploadPreview && !photoUploadPreview.hidden && photoUploadPreview.src;
        if (hasPhoto && !trigger.hasAttribute("data-photo-change-btn")) {
            e.preventDefault();
            return;
        }
        photoUploadInput?.click();
    });
});

photoUploadInput?.addEventListener("click", (e) => {
    e.stopPropagation();
});

photoUploadInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        // High-quality WebP compression for profile avatars: quality 0.75, maxWidth 800px.
        // Provides extremely crisp and recognizable photos at a low file size (30-50KB).
        const optimizedFile = await compressImage(file, 0.75, 800);
        const objectUrl = URL.createObjectURL(optimizedFile);
        const base64 = await fileToBase64(optimizedFile);
        
        if (photoUploadPreview) {
            photoUploadPreview.src = objectUrl;
            photoUploadPreview.hidden = false;
        }
        if (photoPlaceholder) {
            photoPlaceholder.classList.add("is-hidden");
            photoPlaceholder.style.display = "none";
        }
        const circleEl = document.querySelector(".photo-preview-circle");
        if (circleEl) circleEl.classList.add("has-photo");

        // Show the Change Photo button
        const changePhotoBtn = document.querySelector("[data-photo-change-btn]");
        if (changePhotoBtn) changePhotoBtn.classList.add("is-visible");

        // Store in global pending state
        if (pendingMemberData) {
            pendingMemberData.photoUrl = objectUrl;
            pendingMemberData.photoBase64 = base64;
        }

        checkIfMemberFormChanged();
    } catch (err) {
        console.error("GymDeck: Photo upload failed:", err);
    }
});

photoUploadBackButton?.addEventListener("click", () => {
    addMemberModal?.classList.remove("is-page-2");
});

photoUploadNextButton?.addEventListener("click", () => {
    addMemberModal?.classList.remove("is-page-2");
    if (memberFormMode === "edit") {
        addMemberModal?.classList.add("is-page-4");
        addMemberModal?.classList.remove("is-page-3");
    } else {
        setDocUploadModalState(true, pendingMemberData?.name || "Member");
    }
});

addMemberCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    clearMemberFormErrors();
    const prevMemberId = activeVerificationMemberId;
    const isVerificationOpen = document.body.classList.contains("verification-modal-open");
    setAddMemberModalState(false);
    if (prevMemberId && isVerificationOpen) {
      const row = document.querySelector(`[data-member-card][data-member-id="${prevMemberId}"]`);
      if (row) {
        initVerificationCenter(row, lastDocumentTrigger);
      }
    }
  });
});

docUploadBackButton?.addEventListener("click", () => {
  if (activeVerificationMemberId && document.body.classList.contains("verification-modal-open")) {
    setAddMemberModalState(false);
    const row = document.querySelector(`[data-member-card][data-member-id="${activeVerificationMemberId}"]`);
    if (row) {
      initVerificationCenter(row, lastDocumentTrigger);
    }
  } else if (addMemberModal?.classList.contains("is-only-doc-upload")) {
    // In "Upload Now" flow: close upload modal and reopen verification center
    setAddMemberModalState(false);
    if (activeVerificationMemberId) {
      const row = document.querySelector(`[data-member-card][data-member-id="${activeVerificationMemberId}"]`);
      if (row) {
        initVerificationCenter(row, lastDocumentTrigger);
      }
    }
  } else {
    addMemberModal?.classList.add("is-page-2");
    addMemberModal?.classList.remove("is-page-3");
  }
});

docUploadNextButton?.addEventListener("click", async () => {
  if (activeVerificationMemberId) {
    await saveUploadedDocuments(docUploadNextButton);
  } else {
    addMemberModal?.classList.remove("is-page-3");
    addMemberModal?.classList.add("is-page-4");
  }
});

planningBackButton?.addEventListener("click", () => {
  if (memberFormMode === "edit") {
    addMemberModal?.classList.add("is-page-2");
    addMemberModal?.classList.remove("is-page-4");
  } else {
    addMemberModal?.classList.add("is-page-3");
    addMemberModal?.classList.remove("is-page-4");
  }
});

addMemberUploadTriggers.forEach((button) => {
  button.addEventListener("click", () => {
    const wrapper = button.closest(".member-upload") || button.closest(".doc-upload-card-actions");
    wrapper?.querySelector("[data-member-upload-input], [data-doc-upload-input]")?.click();
  });
});

addMemberUploadInputs.forEach((input) => {
  input.addEventListener("change", async () => {
    syncUploadMeta(input);
    await syncUploadPreview(input);
    const field = input.closest(".member-field");
    if (field) setFieldErrorState(field, "");

    if (addMemberFormAlert && !validateMemberForm().length) {
      addMemberFormAlert.hidden = true;
      addMemberFormAlert.textContent = "";
    }

    checkIfMemberFormChanged();
  });
});

// Robust delegated click event listener to handle file removal
document.addEventListener("click", (e) => {
  const removeBtn = e.target.closest("[data-member-upload-remove], [data-doc-upload-remove]");
  if (removeBtn) {
    e.preventDefault();
    e.stopPropagation();
    
    // Instantly close the calendar modal if open
    closeDatePicker();
    
    console.log("GymDeck: Remove button clicked:", removeBtn);
    const wrapper = removeBtn.closest(".member-upload") || removeBtn.closest(".doc-upload-card-actions");
    const input = wrapper?.querySelector("[data-member-upload-input], [data-doc-upload-input]");
    if (input) {
      console.log("GymDeck: Resetting file input value:", input.id || input.dataset.docUploadInput);
      input.value = "";
      clearUploadPreview(input);
      syncUploadMeta(input);
      checkIfMemberFormChanged();
    } else {
      console.error("GymDeck: File input element not found for remove button wrapper:", wrapper);
    }
  }
});

addMemberDobTrigger?.addEventListener("click", (e) => {
  e.stopPropagation(); // Prevents document click from triggering
  
  if (!addMemberDatePickerPanel.hidden) {
    closeDatePicker();
  } else {
    // Close other custom dropdowns
    document.querySelectorAll(".custom-select-wrapper.is-open").forEach(other => {
      other.classList.remove("is-open");
    });
    
    const selectedDate = parseCalendarValue(addMemberDobInput?.value || "");
    activeCalendarDate = selectedDate || activeCalendarDate || new Date();
    datePickerMode = "day";
    renderDatePicker();
    openDatePicker();
  }
});

addMemberDobDisplay?.addEventListener("click", (e) => {
  e.stopPropagation();
  addMemberDobTrigger?.click();
});

// Close calendar when other form elements inside the modal are clicked or focused
document.querySelectorAll(".member-form-page input, .member-form-page textarea, .member-form-page select").forEach(inputEl => {
  if (inputEl.closest(".date-input-wrap")) return;

  inputEl.addEventListener("focus", () => {
    closeDatePicker();
  });
  inputEl.addEventListener("click", (e) => {
    closeDatePicker();
  });
});

addMemberDatePickerPrev?.addEventListener("click", () => {
  activeCalendarDate =
    datePickerMode === "year"
      ? new Date(activeCalendarDate.getFullYear() - 12, activeCalendarDate.getMonth(), 1)
      : new Date(activeCalendarDate.getFullYear(), activeCalendarDate.getMonth() - 1, 1);
  renderDatePicker();
});

addMemberDatePickerNext?.addEventListener("click", () => {
  activeCalendarDate =
    datePickerMode === "year"
      ? new Date(activeCalendarDate.getFullYear() + 12, activeCalendarDate.getMonth(), 1)
      : new Date(activeCalendarDate.getFullYear(), activeCalendarDate.getMonth() + 1, 1);
  renderDatePicker();
});

addMemberDatePickerTitle?.addEventListener("click", () => {
  datePickerMode = datePickerMode === "year" ? "day" : "year";
  renderDatePicker();
});

addMemberDatePickerToday?.addEventListener("click", () => {
  if (addMemberDobInput) {
    addMemberDobInput.value = formatCalendarValue(activeCalendarDate);
  }

  syncDateDisplay();
  closeDatePicker();
  checkIfMemberFormChanged();
});

addMemberDatePickerClear?.addEventListener("click", () => {
  if (addMemberDobInput) {
    addMemberDobInput.value = "";
  }

  syncDateDisplay();
  renderDatePicker();
  closeDatePicker();
  setFieldErrorState(
    addMemberDobDisplay?.closest(".member-field"),
    ""
  );
  checkIfMemberFormChanged();
});

let pendingMemberData = null;

addMemberSaveButton?.addEventListener("click", async () => {
  // Always proceed, ignoring validation errors for the "NEXT" action as requested
  clearMemberFormErrors();
  const newMemberPayload = getNewMemberPayload();
  
  // Store the data temporarily instead of saving immediately
  pendingMemberData = newMemberPayload;
  
  // Transition to Profile Photo page (Page 2)
  addMemberModal?.classList.add("is-page-2");
  addMemberModal?.classList.remove("is-page-3");
  addMemberModal?.classList.remove("is-page-4");
});

// Auto-select Next/Save & Finish action when user presses Enter key in the form modal
addMemberModal?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    // If the user is focusing a textarea or a button, let the browser handle it naturally
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") {
      return;
    }
    
    // Check which page is currently active in the modal
    const isPage2 = addMemberModal.classList.contains("is-page-2");
    const isPage3 = addMemberModal.classList.contains("is-page-3");
    const isPage4 = addMemberModal.classList.contains("is-page-4");
    
    e.preventDefault();
    
    if (isPage4) {
      if (docUploadSaveButton && !docUploadSaveButton.disabled) {
        docUploadSaveButton.click();
      }
    } else if (isPage3) {
      if (docUploadNextButton && !docUploadNextButton.disabled) {
        docUploadNextButton.click();
      }
    } else if (isPage2) {
      if (photoUploadNextButton && !photoUploadNextButton.disabled) {
        photoUploadNextButton.click();
      }
    } else {
      // Page 1
      if (addMemberSaveButton && !addMemberSaveButton.disabled) {
        addMemberSaveButton.click();
      }
    }
  }
});

const saveUploadedDocuments = async (submitButton) => {
  if (!pendingMemberData && !activeVerificationMemberId) {
    setAddMemberModalState(false);
    return;
  }

  if (memberFormMode === "edit") {
    // --- Edit Member Saving Flow ---
    const updatedMember = {
      name: pendingMemberData.name,
      contactNumber: pendingMemberData.contactNumber,
      alternateContact: pendingMemberData.alternateContact || "",
      email: pendingMemberData.email || "",
      dobValue: pendingMemberData.dobValue || "",
      dobDisplay: formatDisplayDate(pendingMemberData.dobValue),
      height: pendingMemberData.height || "",
      weight: pendingMemberData.weight || "",
      gender: pendingMemberData.gender || "OTHER",
      bloodGroup: pendingMemberData.bloodGroup || "",
      address: pendingMemberData.address || "",
      docsLabel: activeMoreOptionsRow ? (activeMoreOptionsRow.dataset.memberDocsLabel || "No Documents") : "No Documents",
      joiningDateValue: activeMoreOptionsRow ? (activeMoreOptionsRow.dataset.memberJoinedDateVal || "") : "",
      joiningTimeValue: activeMoreOptionsRow ? (activeMoreOptionsRow.dataset.memberJoinedTimeVal || "") : "",
      joiningDateDisplay: activeMoreOptionsRow ? (activeMoreOptionsRow.dataset.memberJoinedDateDisp || "") : "",
      joiningTimeDisplay: activeMoreOptionsRow ? (activeMoreOptionsRow.dataset.memberJoinedTimeDisp || "") : "",
      photoUrl: pendingMemberData.photoUrl || (activeMoreOptionsRow ? (activeMoreOptionsRow.dataset.memberPhotoUrl || "") : ""),
      photoBase64: pendingMemberData.photoBase64 || (activeMoreOptionsRow ? (activeMoreOptionsRow.dataset.memberPhotoBase64 || "") : "")
    };

    // 1. Instantly update the DOM card row in-place
    if (activeMoreOptionsRow) {
      updateMemberRowInPlace(activeMoreOptionsRow, updatedMember);
      
      // Update details modal values instantly in background
      const moreBtn = activeMoreOptionsRow.querySelector(".member-more-btn");
      if (moreBtn) {
        setMoreOptionsModalState(true, moreBtn);
      }
    }

    // 2. Perform backend persistence in the background
    if (window.__TAURI__) {
      const originalText = submitButton ? submitButton.textContent : "Save & Finish";
      if (submitButton) {
        submitButton.setAttribute("disabled", "true");
        submitButton.textContent = "Saving...";
      }

      (async () => {
        try {
          const rawMemberStr = activeMoreOptionsRow?.dataset.rawMember;
          if (rawMemberStr) {
            const m = JSON.parse(rawMemberStr);
            m.full_name = pendingMemberData.name;
            m.phone = pendingMemberData.contactNumber;
            m.alternate_phone = pendingMemberData.alternateContact || null;
            m.email = pendingMemberData.email || null;
            m.dob = pendingMemberData.dobValue || null;
            m.address = pendingMemberData.address || null;
            m.height = pendingMemberData.height || null;
            m.weight = pendingMemberData.weight || null;
            m.gender = pendingMemberData.gender || "OTHER";
            m.blood_group = pendingMemberData.bloodGroup || null;
            if (pendingMemberData.photoBase64) {
              m.profile_photo_path = pendingMemberData.photoBase64;
            }
            
            await window.__TAURI__.core.invoke("update_member_command", { member: m });
            console.log(`GymDeck: Member ${m.id} successfully updated in SQLite.`);
          }
          
          setTimeout(async () => {
            await loadMembersFromBackend(false);
            
            // Re-sync options view
            if (editingMemberId) {
              const updatedRow = document.querySelector(`[data-member-card][data-member-id="${editingMemberId}"]`);
              if (updatedRow) {
                const moreBtn = updatedRow.querySelector(".member-more-btn");
                if (moreBtn) {
                  setMoreOptionsModalState(true, moreBtn);
                }
              }
            }
          }, 300);
        } catch (err) {
          console.error("GymDeck: Failed to update member in database:", err);
        } finally {
          if (submitButton) {
            submitButton.removeAttribute("disabled");
            submitButton.textContent = originalText;
          }
        }
      })();
    }

    resetMemberForm();
    setAddMemberModalState(false);
    return;
  }

  // Enterprise Backend Integration: Persist to encrypted SQLite
  if (window.__TAURI__) {
    const originalText = submitButton ? submitButton.textContent : "Save & Finish";
    if (submitButton) {
      submitButton.setAttribute("disabled", "true");
      submitButton.textContent = "Saving...";
    }

    try {
      // Collect all documents from the unified inputs
      const uploadedDocs = [];
      addMemberUploadInputs.forEach((input) => {
        const data = uploadPreviewUrls.get(input);
        if (data) {
          const field = input.closest(".member-field");
          const card = input.closest(".doc-upload-card");
          const labelInput = field?.querySelector("input[type='text']");
          const strongLabel = card?.querySelector("strong");
          
          let cleanLabel = "Document";
          if (labelInput?.value) {
            cleanLabel = labelInput.value.trim();
          } else if (strongLabel?.textContent) {
            cleanLabel = strongLabel.textContent.replace(/\s*\*+$/, "").trim();
          } else if (input.dataset.uploadLabel) {
            cleanLabel = input.dataset.uploadLabel.trim();
          } else if (input.dataset.docUploadInput) {
            const raw = input.dataset.docUploadInput;
            cleanLabel = raw.charAt(0).toUpperCase() + raw.slice(1);
            if (cleanLabel === "Aadhaar") cleanLabel = "Aadhaar Card";
            if (cleanLabel === "Pan") cleanLabel = "PAN Card";
            if (cleanLabel === "Health") cleanLabel = "Health Certificate";
            if (cleanLabel === "Others") cleanLabel = "Other Document";
          }

          uploadedDocs.push({
            label: cleanLabel,
            base64: data.base64Data,
            objectUrl: data.objectUrl
          });
        }
      });

      if (activeVerificationMemberId) {
        // --- 1. Existing Member Flow ---
        const gymId = "00000000-0000-0000-0000-000000000000";
        const rustDocs = uploadedDocs.map(d => {
          const fileBytes = dataUrlToBytes(d.base64);
          return {
            id: crypto.randomUUID(),
            member_id: activeVerificationMemberId,
            gym_id: gymId,
            doc_name: d.label,
            doc_type: d.label.toLowerCase().includes("aadhaar") ? "id" : 
                      d.label.toLowerCase().includes("health") ? "health" :
                      d.label.toLowerCase().includes("residential") ? "residence" : "other",
            file_content: fileBytes,
            file_size: formatFileSize(fileBytes.length),
            upload_date: new Date().toISOString(),
            status: "verified"
          };
        });

        await window.__TAURI__.core.invoke("save_member_documents_command", {
          memberId: activeVerificationMemberId,
          documents: rustDocs
        });
        
        console.log(`GymDeck: Appended ${rustDocs.length} documents for member: ${activeVerificationMemberId}`);

        // Update local session registry
        if (rustDocs.length > 0) {
          const sessionDocs = rustDocs.map((d, idx) => {
            const mType = detectMimeType(d.file_content);
            return {
              id: d.id,
              name: d.doc_name,
              status: d.status,
              date: new Date(d.upload_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              size: d.file_size || formatFileSize(d.file_content.length),
              url: uploadedDocs[idx]?.objectUrl || null,
              mimeType: mType
            };
          });
          
          const existingDocs = memberDocsRegistry.get(activeVerificationMemberId) || [];
          const mergedDocs = [...existingDocs, ...sessionDocs];
          memberDocsRegistry.set(activeVerificationMemberId, mergedDocs);
          memberDocsRegistry.set(activeVerificationMemberName, mergedDocs);
        }

        await loadMembersFromBackend(false);
        resetUploadFields();
        setAddMemberModalState(false);

        // Reopen verification modal directly with the updated documents!
        const row = document.querySelector(`[data-member-card][data-member-id="${activeVerificationMemberId}"]`);
        if (row) {
          initVerificationCenter(row, lastDocumentTrigger);
        }
      } else {
        // --- 2. New Member Registration Flow ---
        const memberCode = `GD-${Math.floor(1000 + Math.random() * 9000)}`;
        const memberId = crypto.randomUUID();
        const gymId = "00000000-0000-0000-0000-000000000000";

        const rustMember = {
          id: memberId,
          gym_id: gymId,
          member_code: memberCode,
          full_name: pendingMemberData.name || "Unnamed Member",
          phone: pendingMemberData.contactNumber || "0000000000",
          alternate_phone: pendingMemberData.alternateContact,
          email: pendingMemberData.email,
          gender: pendingMemberData.gender || "OTHER",
          blood_group: pendingMemberData.bloodGroup || null,
          dob: pendingMemberData.dobValue || new Date().toISOString().split('T')[0],
          address: pendingMemberData.address,
          height: pendingMemberData.height,
          weight: pendingMemberData.weight,
          membership_plan_id: null,
          membership_status: "ACTIVE",
          joined_at: new Date().toISOString(),
          expires_at: null,
          profile_photo_path: pendingMemberData.photoBase64 || null,
          notes: uploadedDocs.map(d => d.label).join(", "),
          created_by_user_id: "00000000-0000-0000-0000-000000000000",
          updated_by_user_id: "00000000-0000-0000-0000-000000000000",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          deleted_by_user_id: null
        };

        const rustDocs = uploadedDocs.map(d => {
          const fileBytes = dataUrlToBytes(d.base64);
          return {
            id: crypto.randomUUID(),
            member_id: memberId,
            gym_id: gymId,
            doc_name: d.label,
            doc_type: d.label.toLowerCase().includes("aadhaar") ? "id" : 
                      d.label.toLowerCase().includes("health") ? "health" :
                      d.label.toLowerCase().includes("residential") ? "residence" : "other",
            file_content: fileBytes,
            file_size: formatFileSize(fileBytes.length),
            upload_date: new Date().toISOString(),
            status: "verified"
          };
        });

        await window.__TAURI__.core.invoke("create_member_command", { 
          member: rustMember,
          documents: rustDocs
        });
        
        console.log(`GymDeck: Member & ${rustDocs.length} Documents successfully persisted to SQLite.`);

        if (rustDocs.length > 0) {
            const sessionDocs = rustDocs.map((d, idx) => {
                const mType = detectMimeType(d.file_content);
                return {
                    id: d.id,
                    name: d.doc_name,
                    status: d.status,
                    date: new Date(d.upload_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    size: d.file_size || formatFileSize(d.file_content.length),
                    url: uploadedDocs[idx]?.objectUrl || null,
                    mimeType: mType
                };
            });
            memberDocsRegistry.set(memberId, sessionDocs);
            memberDocsRegistry.set(rustMember.full_name, sessionDocs);
        }

        await loadMembersFromBackend();
        
        resetMemberForm();
        resetUploadFields();
        pendingMemberData = null;
        setAddMemberModalState(false);
        setActiveView("members");
      }
    } catch (err) {
      console.error("GymDeck: Failed to save:", err);
      if (docUploadAlert) {
        docUploadAlert.textContent = `Error: ${err}`;
        docUploadAlert.hidden = false;
      }
    } finally {
      if (submitButton) {
        submitButton.removeAttribute("disabled");
        submitButton.textContent = originalText;
      }
    }
    return;
  }

  // Fallback for non-tauri environments
  if (pendingMemberData) {
    const newRow = createMemberRow(pendingMemberData);
    membersTableBody?.prepend(newRow);
    updateMemberStats();
    updateMemberResults();
    resetMemberForm();
    resetUploadFields();
    pendingMemberData = null;
    setAddMemberModalState(false);
    setActiveView("members");
  } else {
    resetUploadFields();
    setAddMemberModalState(false);
    if (activeVerificationMemberId) {
      const row = document.querySelector(`[data-member-card][data-member-id="${activeVerificationMemberId}"]`);
      if (row) {
        initVerificationCenter(row, lastDocumentTrigger);
      }
    }
  }
};

docUploadSaveButton?.addEventListener("click", () => saveUploadedDocuments(docUploadSaveButton));

getMemberFormFields().forEach((field) => {
  const input = field.querySelector("input:not([type='hidden']), textarea");

  input?.addEventListener("input", () => {
    const isDobField = field.contains(addMemberDobDisplay);
    const currentValue = isDobField ? addMemberDobInput?.value || "" : input.value.trim();

    if (currentValue) {
      setFieldErrorState(field, "");
    }

    if (addMemberFormAlert && !validateMemberForm().length) {
      addMemberFormAlert.hidden = true;
      addMemberFormAlert.textContent = "";
    }

    checkIfMemberFormChanged();
  });
});

sidebar?.addEventListener("click", (event) => {
  const link = event.target.closest("[data-view]");
  if (link && !link.closest(".nav-subitem.logout")) {
    event.preventDefault();
    setActiveView(link.dataset.view || "dashboard");
  }
});

// Remove the old static loop
// overviewLinks.forEach((link) => { ... });

comingSoonButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetView = button.dataset.viewTarget || "dashboard";
    const currentPreviewIndex = previewOrder.indexOf(activeView);
    const nextPreview =
      currentPreviewIndex >= 0
        ? previewOrder[(currentPreviewIndex + 1) % previewOrder.length]
        : previewOrder[0];
    const nextView = targetView === "members" ? nextPreview : targetView;
    setActiveView(nextView);
  });
});

let memberSearchTimeout;
const debounce = (fn, delay) => (...args) => {
  clearTimeout(memberSearchTimeout);
  memberSearchTimeout = setTimeout(() => fn(...args), delay);
};

paginationPrev?.addEventListener("click", () => {
  if (currentMembersPage > 1) {
    currentMembersPage--;
    renderCurrentMemberPage();
    const membersStage = document.querySelector(".members-stage");
    if (membersStage) membersStage.scrollTop = 0;
    const membersTableWrap = document.querySelector(".members-table-wrap");
    if (membersTableWrap) membersTableWrap.scrollTop = 0;
  }
});

paginationNext?.addEventListener("click", () => {
  const totalFiltered = getFilteredMemberCount();
  const totalPages = Math.ceil(totalFiltered / MEMBERS_PER_PAGE);
  if (currentMembersPage < totalPages) {
    currentMembersPage++;
    renderCurrentMemberPage();
    const membersStage = document.querySelector(".members-stage");
    if (membersStage) membersStage.scrollTop = 0;
    const membersTableWrap = document.querySelector(".members-table-wrap");
    if (membersTableWrap) membersTableWrap.scrollTop = 0;
  }
});

memberSearchInput?.addEventListener("input", debounce(() => {
  updateMemberResults();
}, 150));




memberFilterButtons.forEach((button) => {
  const isInitiallyActive = button.dataset.memberFilter === activeMemberFilter;
  button.setAttribute("aria-pressed", String(isInitiallyActive));

  button.addEventListener("click", () => {
    activeMemberFilter = button.dataset.memberFilter || "all";

    memberFilterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.classList.toggle("is-active", isActive);
      filterButton.setAttribute("aria-pressed", String(isActive));
    });

    updateMemberResults();
  });
});

membersRefreshButton?.addEventListener("click", async () => {
  // Visual Feedback: Start spin animation
  const icon = membersRefreshButton.querySelector("svg");
  if (icon) icon.classList.add("animate-spin");

  if (memberSearchInput) {
    memberSearchInput.value = "";
  }

  activeMemberFilter = "all";
  memberFilterButtons.forEach((button) => {
    const isActive = button.dataset.memberFilter === "all";
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  // Enterprise Sync: Pull latest records from encrypted vault
  if (window.__TAURI__) {
    await loadMembersFromBackend();
  }
  
  updateMemberResults();

  // Reset icon animation
  setTimeout(() => {
    if (icon) icon.classList.remove("animate-spin");
  }, 600);
});

// CONSOLIDATED ESC KEY LISTENER (Stacked modal dismissal flow)
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    // 1. Delete Confirmation Modal (front-most)
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    if (deleteConfirmModal && !deleteConfirmModal.hidden) {
      setDeleteConfirmState(false);
      return;
    }

    // 2. Member Offboarding Modal
    const offboardingModal = document.getElementById('offboardingModal');
    if (offboardingModal && !offboardingModal.hidden) {
      setOffboardingModalState(false);
      return;
    }

    // 3. Add Member Date Picker Panel
    if (typeof addMemberDatePickerPanel !== "undefined" && addMemberDatePickerPanel && !addMemberDatePickerPanel.hidden) {
      closeDatePicker();
      return;
    }

    // 4. Add/Edit Member Modal / Member Form
    if (document.body.classList.contains("member-form-open")) {
      const prevMemberId = activeVerificationMemberId;
      const isVerificationOpen = document.body.classList.contains("verification-modal-open");
      setAddMemberModalState(false);
      if (prevMemberId && isVerificationOpen) {
        const row = document.querySelector(`[data-member-card][data-member-id="${prevMemberId}"]`);
        if (row) {
          initVerificationCenter(row, lastDocumentTrigger);
        }
      }
      return;
    }

    // 5. Document Viewer Modal (Full-screen PDF/image view)
    if (document.body.classList.contains("document-modal-open")) {
      setDocumentModalState(false);
      return;
    }

    // 6. Document Upload Modal
    if (document.body.classList.contains("doc-upload-open")) {
      setDocUploadModalState(false);
      return;
    }

    // 7. Verification Details Modal (Member Documents Center)
    if (document.body.classList.contains("verification-modal-open")) {
      setVerificationModalState(false);
      return;
    }

    // 8. More Options Modal (Member Profile details/actions panel)
    const moreOptionsModal = document.getElementById('moreOptionsModal');
    if (moreOptionsModal && moreOptionsModal.classList.contains('is-active')) {
      setMoreOptionsModalState(false);
      return;
    }

    // 9. Logout Dialog
    if (document.body.classList.contains("logout-dialog-open")) {
      setLogoutDialogState(false);
      return;
    }

    // 10. Mobile Menu / Navigation Menu
    setMenuState(false);
  }
});

mobileNavBreakpoint.addEventListener("change", (event) => {
  if (!event.matches) {
    setMenuState(false);
  }
});

document.addEventListener("click", (event) => {
  if (!addMemberDatePicker || addMemberDatePickerPanel.hidden) {
    return;
  }

  if (!addMemberDatePicker.contains(event.target)) {
    closeDatePicker();
  }
});

// Lazy mounting is now handled by setActiveView
setActiveView(activeView);
hideDeletedMembersInAllViews();
refreshSidebarScrollIndicator();
updateMemberAges();
updateMemberResults();
syncDateDisplay();
renderDatePicker();
resetUploadFields();

// --- Delete Member Modal Logic ---
const offboardingBackdrop = document.getElementById('offboardingBackdrop');
const offboardingModal = document.getElementById('offboardingModal');
const offboardingForm = document.getElementById('offboardingForm');

const setOffboardingModalState = (isOpen) => {
  if (isOpen) {
    offboardingBackdrop.hidden = false;
    offboardingModal.hidden = false;
    void offboardingBackdrop.offsetWidth;
    offboardingBackdrop.classList.add('is-active');
    offboardingModal.classList.add('is-active');
  } else {
    offboardingBackdrop.classList.remove('is-active');
    offboardingModal.classList.remove('is-active');
    setTimeout(() => {
      offboardingBackdrop.hidden = true;
      offboardingModal.hidden = true;
      offboardingForm?.reset();
    }, 300);
  }
};

const setDeleteConfirmState = (isOpen) => {
  if (isOpen) {
    const memberName = document.getElementById('dashMemberName')?.textContent || 'this member';
    const confirmNameEl = document.getElementById('deleteMemberNameConfirm');
    if (confirmNameEl) confirmNameEl.textContent = memberName;

    deleteConfirmBackdrop.hidden = false;
    deleteConfirmModal.hidden = false;
    void deleteConfirmBackdrop.offsetWidth;
    deleteConfirmBackdrop.classList.add('is-active');
    deleteConfirmModal.classList.add('is-active');
  } else {
    deleteConfirmBackdrop.classList.remove('is-active');
    deleteConfirmModal.classList.remove('is-active');
    setTimeout(() => {
      deleteConfirmBackdrop.hidden = true;
      deleteConfirmModal.hidden = true;
    }, 300);
  }
};

let pendingDeleteReason = "Cancelled";
let pendingDeleteFeedback = "";

const showToast = (message) => {
  const toast = document.getElementById("toastNotification");
  const toastMsg = document.getElementById("toastMessage");
  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.hidden = false;
  // Trigger reflow
  void toast.offsetWidth;
  toast.classList.add("is-active");

  setTimeout(() => {
    toast.classList.remove("is-active");
    setTimeout(() => {
      toast.hidden = true;
    }, 400);
  }, 3000);
};

document.addEventListener('click', async (event) => {
  const deleteTrigger = event.target.closest('[data-member-delete-trigger]');
  const offboardingCancel = event.target.closest('[data-offboarding-cancel]');
  const cancelBtn = event.target.closest('[data-delete-cancel]');
  const confirmBtn = event.target.closest('[data-delete-confirm]');
  
  if (deleteTrigger) {
    setOffboardingModalState(true);
    return;
  }
  
  if (offboardingCancel || (offboardingBackdrop && event.target === offboardingBackdrop)) {
    setOffboardingModalState(false);
    return;
  }
  
  if (cancelBtn || (deleteConfirmBackdrop && event.target === deleteConfirmBackdrop)) {
    setDeleteConfirmState(false);
    return;
  }
  
  if (confirmBtn) {
    console.log("Member deletion confirmed.");
    
    if (activeMoreOptionsRow) {
      const row = activeMoreOptionsRow;
      const memberId = row.dataset.memberId || `MEM-${Math.floor(1000 + Math.random() * 9000)}`;
      
      try {
        if (window.__TAURI__) {
          await window.__TAURI__.core.invoke("soft_delete_member_command", { memberId: memberId });
          console.log(`GymDeck: Successfully deleted member ${memberId} from database.`);
        }
      } catch (err) {
        console.error("GymDeck: Database deletion failed. Proceeding with UI update anyway.", err);
      }

      // 1. Extract member data for transfer
      const memberName = row.querySelector('.member-name-cell strong')?.textContent || "Unknown Member";
      const memberImg = row.querySelector('.member-photo')?.src || `https://api.dicebear.com/7.x/avataaars/svg?seed=${memberName}`;
      
      const phoneText = row.querySelector('.member-stack span:first-child')?.textContent || "";
      const phone = phoneText.replace('Primary', '').trim() || "Not provided";
      
      const emailText = row.querySelector('.member-stack span:nth-child(3)')?.textContent || "";
      const email = emailText.replace('Email', '').trim() || "Not provided";
      
      const joinedDateText = row.querySelector('[data-member-joined-date]')?.textContent || "";
      const joinedDate = joinedDateText.replace('Date', '').trim() || new Intl.DateTimeFormat('en-GB').format(new Date());

      const transferredMember = {
        id: memberId,
        name: memberName,
        formerPlan: "Basic Member",
        status: pendingDeleteReason.charAt(0).toUpperCase() + pendingDeleteReason.slice(1),
        joinedDate: joinedDate,
        expiryDate: new Intl.DateTimeFormat('en-GB').format(new Date()),
        daysSinceExpiry: 0,
        lastAttendance: "Today",
        reactivationScore: "Medium",
        potentialRevenue: 1999,
        reason: pendingDeleteFeedback || `Reason: ${pendingDeleteReason}`,
        intelligence: "Transferred from directory.",
        image: memberImg,
        email: email,
        phone: phone
      };

      // 2. Save to Local Storage for Persistence
      try {
        const stored = localStorage.getItem("gymdeck_past_members");
        const pastMembersList = stored ? JSON.parse(stored) : [];
        pastMembersList.unshift(transferredMember);
        localStorage.setItem("gymdeck_past_members", JSON.stringify(pastMembersList));
      } catch (e) {
        console.error("Failed to save past member to localStorage", e);
      }

      // 3. Dispatch event to PastMembers React component (for instant UI update if mounted)
      window.dispatchEvent(new CustomEvent('gymdeck:member-transferred', {
        detail: transferredMember
      }));

      // 4. Remove row from directory
      row.remove();
      updateMemberResults(false);
      
      // Show Success Toast
      showToast("Member deleted successfully");
    }

    setDeleteConfirmState(false);
    setOffboardingModalState(false);
    
    // Hide parent profile modal
    setMoreOptionsModalState(false);
  }
});

offboardingForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(offboardingForm);
  const deleteReason = formData.get('delete_reason');
  
  if (!deleteReason) {
    const optionsContainer = offboardingForm.querySelector('.offboarding-options');
    if (optionsContainer) {
      optionsContainer.classList.add('has-error');
      // Trigger/re-trigger vibration animation
      optionsContainer.classList.remove('shake-vibrate');
      void optionsContainer.offsetWidth; // Force reflow
      optionsContainer.classList.add('shake-vibrate');
      
      optionsContainer.addEventListener('animationend', () => {
        optionsContainer.classList.remove('shake-vibrate');
      }, { once: true });

      // Clear any existing fade-away timer
      if (optionsContainer.dataset.fadeTimeout) {
        clearTimeout(parseInt(optionsContainer.dataset.fadeTimeout));
      }

      // Automatically fade out the red marks after 3 seconds
      const timeoutId = setTimeout(() => {
        optionsContainer.classList.remove('has-error');
      }, 3000);
      optionsContainer.dataset.fadeTimeout = timeoutId.toString();
    }
    return;
  }
  
  pendingDeleteReason = deleteReason;
  pendingDeleteFeedback = offboardingForm.querySelector('textarea')?.value || "";
  
  console.log(`GymDeck: Offboarding captured. Reason: ${pendingDeleteReason}, Feedback: ${pendingDeleteFeedback}`);
  
  // Instantly show confirmation modal over the current offboarding modal
  setDeleteConfirmState(true);
});

// Clear red marks as soon as the user selects any option
offboardingForm?.querySelectorAll('input[name="delete_reason"]').forEach(input => {
  input.addEventListener('change', () => {
    const optionsContainer = offboardingForm.querySelector('.offboarding-options');
    if (optionsContainer) {
      optionsContainer.classList.remove('has-error');
      if (optionsContainer.dataset.fadeTimeout) {
        clearTimeout(parseInt(optionsContainer.dataset.fadeTimeout));
        delete optionsContainer.dataset.fadeTimeout;
      }
    }
  });
});

resetUploadFields();


const initPreviewControls = () => {
  const previewWindow = document.querySelector('.doc-preview-window');
  
  let initialZoom = 1.0;
  let gestureTimeout = null;
  
  // Trackpad pinch-to-zoom gesture listener
  if (previewWindow) {
    // 1. WebKit Proprietary Gesture Events (Critical for pinch-to-zoom on macOS Tauri)
    previewWindow.addEventListener('gesturestart', (event) => {
      event.preventDefault();
      initialZoom = activeZoom;
      previewWindow.classList.add("is-gesturing");
    }, { passive: false });
    
    previewWindow.addEventListener('gesturechange', (event) => {
      event.preventDefault();
      let newZoom = initialZoom * event.scale;
      newZoom = Math.min(Math.max(newZoom, 1.0), 8.0);
      
      if (newZoom !== activeZoom) {
        if (newZoom === 1.0) {
          activeTranslateX = 0;
          activeTranslateY = 0;
        }
        activeZoom = newZoom;
        applyDocTransform();
      }
    }, { passive: false });
    
    previewWindow.addEventListener('gestureend', (event) => {
      event.preventDefault();
      previewWindow.classList.remove("is-gesturing");
    }, { passive: false });

    // 2. Standard Wheel Events fallback (For Windows/Linux Chromium WebViews & Two-Finger Pan)
    previewWindow.addEventListener('wheel', (event) => {
      // Set gesturing class to bypass transitions during active scrolling/pinch
      previewWindow.classList.add("is-gesturing");
      clearTimeout(gestureTimeout);
      gestureTimeout = setTimeout(() => {
        previewWindow.classList.remove("is-gesturing");
      }, 150);

      // ctrlKey is true when pinching on trackpads
      if (event.ctrlKey) {
        event.preventDefault();
        
        // Calculate dynamic zoom increment (deltaY is negative for zoom in/fingers spreading)
        const zoomStep = -event.deltaY * 0.005;
        let newZoom = activeZoom + zoomStep;
        
        // Clamp zoom between 1.0x (standard size) and 8.0x (maximum close-up zoom)
        newZoom = Math.min(Math.max(newZoom, 1.0), 8.0);
        
        if (newZoom !== activeZoom) {
          if (newZoom === 1.0) {
            activeTranslateX = 0;
            activeTranslateY = 0;
          }
          activeZoom = newZoom;
          applyDocTransform();
        }
      } else {
        // Two-finger move (panning) on trackpad
        if (activeZoom > 1.0) {
          event.preventDefault();
          activeTranslateX -= event.deltaX;
          activeTranslateY -= event.deltaY;
          applyDocTransform();
        }
      }
    }, { passive: false });
  }

  const uploadNowBtn = document.querySelector(".upload-now-btn");
  uploadNowBtn?.addEventListener("click", () => {
    if (activeVerificationMemberId) {
      memberFormMode = "add";
      pendingMemberData = null;
      
      // Save member ID before closing verification modal (setVerificationModalState clears it)
      const savedMemberId = activeVerificationMemberId;
      const savedMemberName = activeVerificationMemberName;
      setVerificationModalState(false);
      activeVerificationMemberId = savedMemberId;
      activeVerificationMemberName = savedMemberName;
      
      if (addMemberModal && addMemberBackdrop) {
        addMemberModal.hidden = false;
        addMemberBackdrop.hidden = false;
        addMemberModal.offsetHeight;
        document.body.classList.add("member-form-open");
        
        addMemberModal.classList.add("is-only-doc-upload");
        addMemberModal.classList.add("is-page-3");
        addMemberModal.classList.remove("is-page-2");
        addMemberModal.classList.remove("is-page-4");
        
        if (docUploadBackButton) {
          docUploadBackButton.textContent = "Cancel";
        }
        
        if (docUploadNextButton) {
          const span = docUploadNextButton.querySelector("span");
          const svg = docUploadNextButton.querySelector("svg");
          if (span) span.textContent = "Save & Finish";
          if (svg) svg.style.display = "none";
        }
        
        if (docUploadCopy) {
          docUploadCopy.textContent = `Upload supporting documents for "${activeVerificationMemberName}" to complete the profile.`;
        }
      }
    }
  });
};

initPreviewControls();

const initCustomSelects = () => {
  // Close custom dropdown menus when clicking outside
  document.addEventListener("click", (e) => {
    const activeWrappers = document.querySelectorAll(".custom-select-wrapper.is-open");
    activeWrappers.forEach(wrapper => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove("is-open");
      }
    });
  });

  const selectWrappers = document.querySelectorAll(".custom-select-wrapper");
  selectWrappers.forEach(wrapper => {
    const trigger = wrapper.querySelector(".custom-dropdown-trigger");
    const menu = wrapper.querySelector(".custom-dropdown-menu");
    const selectEl = wrapper.querySelector("select");
    const triggerValue = wrapper.querySelector(".custom-dropdown-value");
    const items = wrapper.querySelectorAll(".custom-dropdown-item");

    if (!trigger || !menu || !selectEl || !triggerValue) return;

    // Toggle dropdown menu on trigger click
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      
      // Instantly close the calendar modal if open
      closeDatePicker();
      
      // Close other open custom select menus first
      document.querySelectorAll(".custom-select-wrapper.is-open").forEach(other => {
        if (other !== wrapper) {
          other.classList.remove("is-open");
        }
      });

      wrapper.classList.toggle("is-open");
    });

    // Handle custom option click
    items.forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        
        // Instantly close the calendar modal if open
        closeDatePicker();
        
        const val = item.dataset.value;
        selectEl.value = val;

        // Sync the text in the trigger
        triggerValue.textContent = item.textContent;

        // Toggle selected styling
        items.forEach(i => i.classList.remove("is-selected"));
        item.classList.add("is-selected");

        // Close dropdown
        wrapper.classList.remove("is-open");

        // Dispatch change event on native select to trigger validation & checks
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  });
};

initCustomSelects();
syncAllCustomDropdowns();

const initCustomHeights = () => {
  const heightField = getMemberField("Height");
  if (!heightField) return;

  const hiddenInput = heightField.querySelector(".height-final-value");
  const cmInput = heightField.querySelector(".cm-input");
  const ftInput = heightField.querySelector(".ft-input");
  const inInput = heightField.querySelector(".in-input");
  const cmBtn = heightField.querySelector('[data-unit="cm"]');
  const ftBtn = heightField.querySelector('[data-unit="ft"]');
  const ftArea = heightField.querySelector(".ft-in-inputs");

  if (!hiddenInput || !cmInput || !ftInput || !inInput || !cmBtn || !ftBtn || !ftArea) return;

  let activeUnit = "cm";

  const updateFinalValue = () => {
    if (activeUnit === "cm") {
      const cmVal = cmInput.value.trim();
      hiddenInput.value = cmVal ? `${cmVal} cm` : "";
    } else {
      const ftVal = ftInput.value.trim();
      const inVal = inInput.value.trim();
      if (ftVal) {
        hiddenInput.value = `${ftVal} ft ${inVal || 0} in`;
      } else {
        hiddenInput.value = "";
      }
    }
    hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
  };

  cmBtn.addEventListener("click", () => {
    activeUnit = "cm";
    cmBtn.classList.add("active");
    ftBtn.classList.remove("active");
    cmInput.hidden = false;
    ftArea.hidden = true;
    updateFinalValue();
  });

  ftBtn.addEventListener("click", () => {
    activeUnit = "ft";
    ftBtn.classList.add("active");
    cmBtn.classList.remove("active");
    cmInput.hidden = true;
    ftArea.hidden = false;
    updateFinalValue();
  });

  cmInput.addEventListener("input", updateFinalValue);
  ftInput.addEventListener("input", updateFinalValue);
  inInput.addEventListener("input", updateFinalValue);
};

initCustomHeights();

const initCustomWeights = () => {
  const weightField = getMemberField("Weight");
  if (!weightField) return;

  const hiddenInput = weightField.querySelector(".weight-final-value");
  const kgInput = weightField.querySelector(".kg-input");
  const lbsInput = weightField.querySelector(".lbs-input");
  const kgBtn = weightField.querySelector('[data-unit="kg"]');
  const lbsBtn = weightField.querySelector('[data-unit="lbs"]');

  if (!hiddenInput || !kgInput || !lbsInput || !kgBtn || !lbsBtn) return;

  let activeUnit = "kg";

  const updateFinalValue = () => {
    if (activeUnit === "kg") {
      const kgVal = kgInput.value.trim();
      hiddenInput.value = kgVal ? `${kgVal} kg` : "";
    } else {
      const lbsVal = lbsInput.value.trim();
      hiddenInput.value = lbsVal ? `${lbsVal} lbs` : "";
    }
    hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
  };

  kgBtn.addEventListener("click", () => {
    activeUnit = "kg";
    kgBtn.classList.add("active");
    lbsBtn.classList.remove("active");
    kgInput.hidden = false;
    lbsInput.hidden = true;
    updateFinalValue();
  });

  lbsBtn.addEventListener("click", () => {
    activeUnit = "lbs";
    lbsBtn.classList.add("active");
    kgBtn.classList.remove("active");
    kgInput.hidden = true;
    lbsInput.hidden = false;
    updateFinalValue();
  });

  kgInput.addEventListener("input", updateFinalValue);
  lbsInput.addEventListener("input", updateFinalValue);
};

initCustomWeights();

// --- Member Directory CSV Export (Streaming via Tauri IPC) ---
const escapeCsvValue = (val) => {
  if (val === null || val === undefined) return "";
  let str = String(val);
  str = str.replace(/"/g, '""');
  if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
    str = `"${str}"`;
  }
  return str;
};

const initCsvExport = () => {
  const exportBtn = document.getElementById("exportMembersCsv");
  if (!exportBtn) return;

  exportBtn.addEventListener("click", async () => {
    const deletedIds = getDeletedMemberIds();
    const allMembers = cachedMembers.filter(m => m.id && !deletedIds.has(m.id));

    if (allMembers.length === 0) {
      alert("No member data available to export.");
      return;
    }

    const headers = [
      "Member Code","Full Name","Contact Number","Alternate Contact",
      "Email Address","Gender","Blood Group","DOB","Address",
      "Height","Weight","Status","Joining Date","Expiry Date","Notes"
    ];

    // Stream CSV content in chunks
    const CHUNK_SIZE = 100;
    let csvParts = [headers.map(escapeCsvValue).join(",")];

    for (let i = 0; i < allMembers.length; i += CHUNK_SIZE) {
      const chunk = allMembers.slice(i, i + CHUNK_SIZE);
      for (const m of chunk) {
        const rowData = [
          m.member_code || "", m.full_name || "", m.phone || "",
          m.alternate_phone || "", m.email || "", m.gender || "",
          m.blood_group || "", m.dob || "", m.address || "",
          m.height || "", m.weight || "", m.membership_status || "",
          m.joined_at ? new Date(m.joined_at).toISOString().split('T')[0] : "",
          m.expires_at ? new Date(m.expires_at).toISOString().split('T')[0] : "",
          m.notes || ""
        ];
        csvParts.push(rowData.map(escapeCsvValue).join(","));
      }
      // Yield to event loop every chunk to avoid blocking
      await new Promise(r => setTimeout(r, 0));
    }

    const csvString = csvParts.join("\n");
    const filename = `gymdeck_members_export_${new Date().toISOString().split('T')[0]}.csv`;

    if (window.__TAURI__) {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(csvString);
      const base64Data = btoa(String.fromCharCode(...bytes));
      window.__TAURI__.core.invoke("download_document_command", {
        filename,
        base64Data: `data:text/csv;base64,${base64Data}`
      }).then(() => {
        console.log("GymDeck: CSV exported via native save dialog.");
      }).catch(err => {
        if (err !== "Download cancelled") {
          console.error("GymDeck: Failed to save CSV", err);
          alert(`Error exporting CSV: ${err}`);
        }
      });
    } else {
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  });
};

initCsvExport();

// Recalculate zoom layout dimensions on window resize
window.addEventListener("resize", () => {
  if (document.body.classList.contains("verification-modal-open")) {
    applyDocTransform();
  }
});

// Expose modal state controllers globally for React cross-component access
window.setDocumentModalState = setDocumentModalState;
window.setDocumentModalContent = setDocumentModalContent;
