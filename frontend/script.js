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
const mountStageLazy = async (stage) => {
  // Use canonical keys for shared components to prevent redundant remounting
  let canonicalKey = stage;
  if (stage === "membership-plans") {
    canonicalKey = "membership-plans-shared";
  } else if (stage === "daily-checkin" || stage === "attendance") {
    canonicalKey = "daily-checkin-shared";
  }

  if (activeRoots.has(canonicalKey)) return;
  
  let mountPromise;
  if (stage === "membership-plans") {
    mountPromise = import("./MembershipPlans.jsx").then(m => m.mountMembershipPlans());
  } else if (stage === "expiring-memberships") {
    mountPromise = import("./ExpiringMemberships.jsx").then(m => m.mountExpiringMemberships());
  } else if (stage === "freeze-pause") {
    mountPromise = import("./FreezePause.jsx").then(m => m.mountFreezePause());
  } else if (stage === "daily-checkin" || stage === "attendance") {
    mountPromise = import("./DailyCheckin.jsx").then(m => m.mountDailyCheckin());
  } else if (stage === "manual-entry") {
    mountPromise = import("./ManualEntry.jsx").then(m => m.mountManualEntry());
  } else if (stage === "attendance-reports") {
    mountPromise = import("./AttendanceReports.jsx").then(m => m.mountAttendanceReports());
  } else if (stage === "payments") {
    mountPromise = import("./CollectFees.jsx").then(m => m.mountCollectFees());
  } else if (stage === "pending-dues") {
    mountPromise = import("./PendingDues.jsx").then(m => m.mountPendingDues());
  } else if (stage === "payment-history") {
    mountPromise = import("./PaymentHistory.jsx").then(m => m.mountPaymentHistory());
  } else if (stage === "generate-receipt") {
    mountPromise = import("./GenerateReceipt.jsx").then(m => m.mountGenerateReceipt());
  } else if (stage === "renew-membership") {
    mountPromise = import("./RenewMembership.jsx").then(m => m.mountRenewMembership());
  } else if (stage === "trainers") {
    mountPromise = import("./AllTrainers.jsx").then(m => m.mountAllTrainers());
  } else if (stage === "assign-trainer") {
    mountPromise = import("./AssignTrainer.jsx").then(m => m.mountAssignTrainer());
  } else if (stage === "trainer-schedule") {
    mountPromise = import("./TrainerSchedule.jsx").then(m => m.mountTrainerSchedule());
  } else if (stage === "staff-roles") {
    mountPromise = import("./StaffRoles.jsx").then(m => m.mountStaffRoles());
  } else if (stage === "personal-training") {
    mountPromise = import("./PTClients.jsx").then(m => m.mountPTClients());
  } else if (stage === "pt-packages") {
    mountPromise = import("./PTPackages.jsx").then(m => m.mountPTPackages());
  } else if (stage === "session-tracking") {
    mountPromise = import("./SessionTracking.jsx").then(m => m.mountSessionTracking());
  } else if (stage === "trainer-earnings") {
    mountPromise = import("./TrainerEarnings.jsx").then(m => m.mountTrainerEarnings());
  } else if (stage === "notify-members") {
    mountPromise = import("./SendNotification.jsx").then(m => m.mountSendNotification());
  } else if (stage === "revenue-reports") {
    mountPromise = import("./RevenueReport.jsx").then(m => m.mountRevenueReport());
  } else if (stage === "attendance-analytics") {
    mountPromise = import("./AttendanceTrends.jsx").then(m => m.mountAttendanceTrends());
  } else if (stage === "member-growth") {
    mountPromise = import("./MembershipGrowth.jsx").then(m => m.mountMembershipGrowth());
  } else if (stage === "trainer-performance") {
    mountPromise = import("./TrainerPerformance.jsx").then(m => m.mountTrainerPerformance(DOM.trainerPerformanceStage));
  } else if (stage === "gym-profile") {
    mountPromise = import("./GymProfile.jsx").then(m => m.mountGymProfile(DOM.gymProfileStage));
  } else if (stage === "app-settings") {
    mountPromise = import("./AppSettings.jsx").then(m => m.mountAppSettings(DOM.appSettingsStage));
  } else if (stage === "backup-restore") {
    mountPromise = import("./BackupRestore.jsx").then(m => m.mountBackupRestore(DOM.backupRestoreStage));
  } else if (stage === "sync-status") {
    mountPromise = import("./DeviceSync.jsx").then(m => m.mountDeviceSync(DOM.syncStatusStage));
  } else if (stage === "account") {
    mountPromise = import("./Profile.jsx").then(m => m.mountProfile(DOM.profileStage));
  } else if (stage === "documents") {
    mountPromise = import("./MemberDocuments.jsx").then(m => m.mountMemberDocuments());
  } else if (stage === "past-members") {
    mountPromise = import("./PastMembers.jsx").then(m => m.mountPastMembers());
  } else if (stage === "id-proofs") {
    mountPromise = import("./IDProofs.jsx").then(m => m.mountIDProofs());
  } else if (stage === "agreements") {
    mountPromise = import("./Agreements.jsx").then(m => m.mountAgreements());
  }
  
  if (mountPromise) {
    try {
      const root = await mountPromise;
      if (root) activeRoots.set(canonicalKey, root);
      console.log(`GymDeck: Successfully mounted stage: ${stage}`);
    } catch (err) {
      console.error(`GymDeck: Error mounting stage ${stage}:`, err);
    }
  }
};

const unmountInactiveStages = (currentStage) => {
  // Determine the canonical key for the current stage
  let currentCanonicalKey = currentStage;
  if (currentStage === "membership-plans") {
    currentCanonicalKey = "membership-plans-shared";
  } else if (currentStage === "daily-checkin" || currentStage === "attendance") {
    currentCanonicalKey = "daily-checkin-shared";
  }

  // Keep dashboard and the current stage, unmount everything else to save RAM
  for (const [stage, root] of activeRoots.entries()) {
    if (stage !== currentCanonicalKey && stage !== "dashboard") {
      try {
        root.unmount();
        activeRoots.delete(stage);
        console.log(`GymDeck: Unmounted ${stage} to optimize memory`);
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
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" 
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
              url: `https://api.dicebear.com/7.x/shapes/svg?seed=${salt}_doc${i}&backgroundColor=f8f9fa`
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
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" 
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

  document.body.classList.remove("verification-modal-open");
  
  // Wait for transition to finish before removing the specific slide class
  setTimeout(() => {
    verificationModal?.classList.remove("verification-animate-slide");
  }, 1000);

  lastDocumentTrigger?.focus?.();
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

  // 1. Show Professional Loading State
  if (previewWindow) previewWindow.classList.add("is-loading");

  // Determine if it should be rendered in an iframe (PDF) or an img tag
  const isPdf = (doc.url?.toLowerCase().endsWith(".pdf") || doc.name.toLowerCase().includes("aadhaar") || doc.name.toLowerCase().includes("pdf")); 

  if (isPdf && previewPdf) {
    if (previewImg) previewImg.hidden = true;
    previewPdf.hidden = false;
    
    // Clear old src to avoid "flashing" old content
    previewPdf.src = "about:blank";

    // 2. Optimized PDF Loading
    const loadPdf = () => {
        previewPdf.src = doc.url || "about:blank";
        previewPdf.onload = () => {
            if (previewWindow) previewWindow.classList.remove("is-loading");
        };
    };

    // Small timeout to allow UI to breathe
    setTimeout(loadPdf, 50);

  } else if (previewImg) {
    if (previewPdf) previewPdf.hidden = true;
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
  const docsLabel = row.querySelector(".doc-cell span")?.textContent || "No Documents";

  // Update Left Sidebar (Identity Anchor)
  const vPortrait = document.querySelector("[data-verification-portrait]");
  const vName = document.querySelector("[data-verification-member-name]");
  const vJoined = document.querySelector("[data-verification-joined]");
  const vId = document.querySelector("[data-verification-id]");

  if (vPortrait) vPortrait.src = portraitImg;
  if (vName) vName.textContent = memberName;
  if (vJoined) vJoined.textContent = joinDateEl?.textContent?.replace("Date", "").trim() || "May 2026";
  if (vId) vId.textContent = memberId.substring(0, 8).toUpperCase();

  // 1. Show Loading State in Filmstrip
  if (filmstripContainer) {
    filmstripContainer.innerHTML = `<div class="filmstrip-loading">Loading Documents...</div>`;
  }
  
  setVerificationModalState(true, triggerButton);

  try {
    let documents = [];

    if (window.__TAURI__) {
        // 2. Fetch Real Documents from SQLite (Tauri v2 maps Rust snake_case params to camelCase in JS)
        const dbDocs = await window.__TAURI__.core.invoke("get_member_documents_command", { memberId: memberId });
        
        documents = dbDocs.map(d => ({
            id: d.id,
            name: d.doc_name,
            status: d.status,
            date: new Date(d.upload_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            size: d.file_size || "1.2 MB",
            url: bytesToDataUrl(d.file_content) // Convert BLOB to UI-ready URL
        }));
    }

    // 3. Fallback to Mock only if DB is empty and we have a label suggesting docs exist
    if (documents.length === 0) {
        documents = getMockDocuments(memberName, memberId, docsLabel);
    }

    renderFilmstrip(documents);
  } catch (err) {
    console.error("GymDeck: Failed to load documents from DB:", err);
    renderFilmstrip([]); // Show empty state on error
  }
};

const documentMemberLabel = document.querySelector("[data-document-member]");
const documentTypeLabel = document.querySelector("[data-document-type]");
const documentFigure = document.querySelector("[data-document-figure]");
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
const addMemberUploadRemoveButtons = Array.from(document.querySelectorAll("[data-member-upload-remove], [data-doc-upload-remove]"));

// Document upload modal (post-save)
const docUploadAlert = document.querySelector("[data-doc-upload-alert]");
const docUploadCopy = document.querySelector("[data-doc-upload-copy]");
const docUploadBackButton = document.querySelector("[data-doc-upload-back]");
const docUploadNextButton = document.querySelector("[data-doc-upload-next]");
const planningBackButton = document.querySelector("[data-planning-back]");
const docUploadSaveButton = document.querySelector("[data-doc-upload-save-finish]");

const uploadPreviewUrls = new Map();
const memberDocsRegistry = new Map(); // Professional Registry for Session Documents

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
 * Enterprise Utility: Converts a Byte Array (from Rust) to a Data URL for UI rendering.
 */
const bytesToDataUrl = (bytes, mimeType = "application/pdf") => {
  const uint8 = new Uint8Array(bytes);
  const blob = new Blob([uint8], { type: mimeType });
  return URL.createObjectURL(blob);
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
const membersTableBody = document.querySelector(".members-table tbody");
const paginationContainer = document.querySelector("[data-members-pagination]");

// Member Statistics Selectors
const statLoadedProfiles = document.querySelector("[data-stat-loaded-profiles]");
const statVerifiedDocs = document.querySelector("[data-stat-verified-docs]");
const statJoinedQuarter = document.querySelector("[data-stat-joined-quarter]");
const statFollowUps = document.querySelector("[data-stat-follow-ups]");

const updateMemberStats = () => {
  const memberCards = getMemberRows();
  const totalProfiles = memberCards.length;
  
  // 1. Loaded Profiles
  if (statLoadedProfiles) {
    statLoadedProfiles.textContent = totalProfiles;
  }

  // 2. Verified Docs - Count members who have at least 2 documents listed (Govt + Residence)
  const verifiedDocsCount = memberCards.filter(card => {
    const docText = card.querySelector(".doc-cell span")?.textContent || "";
    // Check if it contains multiple documents or "Aadhaar", "Card", etc.
    const hasMultiple = docText.includes(",") || (docText.length > 20);
    return hasMultiple && !docText.includes("Not provided");
  }).length;
  
  if (statVerifiedDocs) {
    statVerifiedDocs.textContent = verifiedDocsCount;
  }

  // 3. Joined This Quarter
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
  const quarterStartDate = new Date(currentYear, quarterStartMonth, 1);

  const joinedThisQuarterCount = memberCards.filter(card => {
    const joinedDateStr = card.querySelector("[data-member-joined-date]")?.dataset.memberJoinedDate;
    if (!joinedDateStr) return false;
    const joinedDate = new Date(joinedDateStr);
    return joinedDate >= quarterStartDate;
  }).length;

  if (statJoinedQuarter) {
    statJoinedQuarter.textContent = joinedThisQuarterCount;
  }

  // 4. Follow-ups - Members missing a phone number or photo
  const followUpsCount = memberCards.filter(card => {
    const searchIndex = card.dataset.search || "";
    const photo = card.querySelector(".member-photo");
    const hasPhoto = photo && !photo.src.includes("dicebear.com"); // Dicebear is used for placeholders
    return searchIndex.includes("not provided") || !hasPhoto;
  }).length;

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
 * Optimizes an image by resizing and reducing quality via Canvas.
 * Returns a new File object with the optimized image.
 */
const compressImage = (file, quality = 0.8, maxWidth = 1600) => {
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
        
        // Fill white background for transparency conversion (PNG to JPEG)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // If compression didn't help or failed, use original
              resolve(file);
            }
          },
          "image/jpeg",
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

const clearDocUploadPreview = (type) => {
  const preview = getDocUploadPreview(type);
  const image = getDocUploadImage(type);
  const pdf = getDocUploadPdf(type);
  const existing = docUploadUrls.get(type);
  if (existing?.objectUrl) {
    URL.revokeObjectURL(existing.objectUrl);
    docUploadUrls.delete(type);
  }
  if (image) { image.src = ""; image.alt = ""; image.hidden = true; }
  if (pdf) { pdf.src = ""; pdf.hidden = true; }
  if (preview) preview.hidden = true;
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
    pdf.src = "";
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
    // Auto-optimize images instantly upon attachment
    if (selectedFile.type.startsWith("image/")) {
      const originalSize = selectedFile.size;
      const optimizedFile = await compressImage(selectedFile);
      
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

    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

    if (isPdf && pdf) {
      pdf.src = objectUrl;
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
  if (photoPlaceholder) photoPlaceholder.style.display = "flex";
  
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

const getMemberRows = () => Array.from(document.querySelectorAll("[data-member-card]"));

const getMemberDobCells = () => Array.from(document.querySelectorAll("[data-member-dob]"));

const getMemberDisplayName = (row) =>
  row?.dataset.memberName ||
  row?.querySelector(".member-name-cell strong")?.textContent?.trim() ||
  row?.children[1]?.textContent?.trim() ||
  "Member Record";

const getMemberField = (label) =>
  addMemberForm?.querySelector(`.member-field[data-field-label="${label}"]`);

const getFieldValue = (label, selector = "input, textarea") =>
  getMemberField(label)?.querySelector(selector)?.value.trim() || "";

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
    member.height,
    member.weight,
    member.address,
    member.docsLabel
  ]
    .join(" ")
    .toLowerCase();

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
      const docsEl = row.querySelector(".doc-cell span");
      const docsLabel = docsEl?.textContent?.trim() || "0 Documents";
      document.getElementById("dashDocsCount").textContent = docsLabel.includes("Verified") ? "4 / 4" : "1 / 4";
    }

    backdrop?.classList.add("is-active");
    modal?.classList.add("is-active");
    document.body.style.overflow = "hidden";
  } else {
    backdrop?.classList.remove("is-active");
    modal?.classList.remove("is-active");
    document.body.style.overflow = "";
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

const createMemberRow = (member) => {
  const row = document.createElement("tr");
  row.setAttribute("data-member-card", "");
  row.dataset.memberName = member.name;
  row.dataset.memberStatus = "verified";
  row.dataset.memberRecent = "true";
  row.dataset.search = createMemberSearchIndex(member);
  row.innerHTML = `
    <td data-label="Member">
      <button class="member-photo-btn" type="button" data-photo-view aria-label="View ${escapeHtml(member.name)} photo">
        <img class="member-photo" src="${escapeHtml(member.photoUrl)}" alt="${escapeHtml(member.name)}" />
      </button>
      <div class="member-name-cell">
        <strong>${escapeHtml(member.name)}</strong>
        <span>New registration</span>
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
        <span>${escapeHtml(member.docsLabel)}</span>
        <button class="doc-view-btn" type="button">View Document</button>
      </div>
    </td>
  `;
  bindMemberRowInteractions(row);
  return row;
};

const getNewMemberPayload = () => {
  const joinedAt = new Date();
  const fullName = getFieldValue("Full Name");
  const contactNumber = getFieldValue("Contact Number");
  const alternateContact = getFieldValue("Alternate Contact");
  const email = getFieldValue("Email Address");
  const dobValue = addMemberDobInput?.value || "";

  return {
    name: fullName,
    contactNumber,
    alternateContact,
    email,
    dobValue,
    dobDisplay: formatDisplayDate(dobValue),
    height: getFieldValue("Height"),
    weight: getFieldValue("Weight"),
    address: getFieldValue("Address"),
    docsLabel: "No Documents",
    joiningDateValue: formatJoinDateValue(joinedAt),
    joiningTimeValue: formatJoinTimeValue(joinedAt),
    joiningDateDisplay: formatJoinDateDisplay(joinedAt),
    joiningTimeDisplay: formatJoinTimeDisplay(joinedAt),
    photoUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fullName || "GymDeckMember")}`
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

const focusInvalidField = (field) => {
  const focusTarget =
    field.querySelector("input:not([type='hidden']), textarea") ||
    field.querySelector("button");

  field.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    focusTarget?.focus?.();
  }, 180);
};

const setDocumentModalContent = ({ memberName, title, imageSrc = "", imageAlt = "" }) => {
  if (documentMemberLabel) {
    documentMemberLabel.textContent = memberName || "Member Record";
  }

  const joinedLabel = document.querySelector("[data-document-joined]");
  const idLabel = document.querySelector("[data-document-id]");
  const downloadBtns = document.querySelectorAll(".btn-card-bottom-download");

  if (joinedLabel) {
    joinedLabel.textContent = "May 2026";
  }
  if (idLabel) {
    idLabel.textContent = "#" + (Math.floor(Math.random() * 9000) + 1000);
  }

  // Handle Download Logic for all instances (Full and Minimal)
  downloadBtns.forEach(btn => {
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
        const modal = newBtn.closest(".luxury-profile-card");
        const img = modal?.querySelector(".card-portrait");
        if (img && img.src) {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${(memberName || "GymDeck").replace(/\s+/g, '_')}_Identity_Card.png`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }

        // 3. Success State
        setTimeout(() => {
          newBtn.classList.remove("is-loading");
          newBtn.classList.add("is-success");

          setTimeout(() => {
            newBtn.classList.remove("is-success");
          }, 2000);
        }, 500);

      } catch (err) {
        console.error("Download failed:", err);
        newBtn.classList.remove("is-loading");
      }
    });
  });

  // Ensure we have a valid image for the portrait
  const finalPortraitSrc = imageSrc || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(memberName || "GymDeck")}`;
  
  if (documentImage) {
    documentImage.src = finalPortraitSrc;
    documentImage.alt = imageAlt || title || memberName || "Portrait";
  }
};

const performLogout = () => {
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

const setStageVisibility = (activeStage) => {
  console.log(`GymDeck: Setting visibility for stage: ${activeStage}`);
  console.log(`GymDeck: assignTrainerStage element:`, DOM.assignTrainerStage);
  
  dashboardStage?.classList.toggle("is-hidden", activeStage !== "dashboard");
  membersStage?.classList.toggle("is-active", activeStage === "members");

  DOM.membershipPlansStage?.classList.toggle("is-active", activeStage === "membership-plans");
  DOM.expiringMembershipsStage?.classList.toggle("is-active", activeStage === "expiring-memberships");
  DOM.freezePauseStage?.classList.toggle("is-active", activeStage === "freeze-pause");
  DOM.dailyCheckinStage?.classList.toggle("is-active", activeStage === "daily-checkin");
  DOM.manualEntryStage?.classList.toggle("is-active", activeStage === "manual-entry");
  DOM.attendanceReportsStage?.classList.toggle("is-active", activeStage === "attendance-reports");
  DOM.paymentsStage?.classList.toggle("is-active", activeStage === "payments");
  DOM.pendingDuesStage?.classList.toggle("is-active", activeStage === "pending-dues");
  DOM.paymentHistoryStage?.classList.toggle("is-active", activeStage === "payment-history");
  DOM.generateReceiptStage?.classList.toggle("is-active", activeStage === "generate-receipt");
  DOM.renewMembershipStage?.classList.toggle("is-active", activeStage === "renew-membership");
  DOM.trainersStage?.classList.toggle("is-active", activeStage === "trainers");
  DOM.assignTrainerStage?.classList.toggle("is-active", activeStage === "assign-trainer");
  DOM.trainerScheduleStage?.classList.toggle("is-active", activeStage === "trainer-schedule");
  DOM.staffRolesStage?.classList.toggle("is-active", activeStage === "staff-roles");
  DOM.ptClientsStage?.classList.toggle("is-active", activeStage === "personal-training");
  DOM.ptPackagesStage?.classList.toggle("is-active", activeStage === "pt-packages");
  DOM.sessionTrackingStage?.classList.toggle("is-active", activeStage === "session-tracking");
  DOM.trainerEarningsStage?.classList.toggle("is-active", activeStage === "trainer-earnings");
  DOM.notifyMembersStage?.classList.toggle("is-active", activeStage === "notify-members");
  DOM.revenueReportsStage?.classList.toggle("is-active", activeStage === "revenue-reports");
  DOM.attendanceAnalyticsStage?.classList.toggle("is-active", activeStage === "attendance-analytics");
  DOM.memberGrowthStage?.classList.toggle("is-active", activeStage === "member-growth");
  DOM.trainerPerformanceStage?.classList.toggle("is-active", activeStage === "trainer-performance");
  DOM.gymProfileStage?.classList.toggle("is-active", activeStage === "gym-profile");
  DOM.appSettingsStage?.classList.toggle("is-active", activeStage === "app-settings");
  DOM.backupRestoreStage?.classList.toggle("is-active", activeStage === "backup-restore");
  DOM.syncStatusStage?.classList.toggle("is-active", activeStage === "sync-status");
  DOM.profileStage?.classList.toggle("is-active", activeStage === "profile");
  DOM.memberDocumentsStage?.classList.toggle("is-active", activeStage === "member-documents");
  DOM.idProofsStage?.classList.toggle("is-active", activeStage === "id-proofs");
  DOM.agreementsStage?.classList.toggle("is-active", activeStage === "agreements");
  DOM.pastMembersStage?.classList.toggle("is-active", activeStage === "past-members");
  comingSoonStage?.classList.toggle("is-active", activeStage === "coming-soon");

  dashboardStage?.setAttribute("aria-hidden", String(activeStage !== "dashboard"));
  membersStage?.setAttribute("aria-hidden", String(activeStage !== "members"));

  DOM.membershipPlansStage?.setAttribute("aria-hidden", String(activeStage !== "membership-plans"));
  DOM.expiringMembershipsStage?.setAttribute("aria-hidden", String(activeStage !== "expiring-memberships"));
  DOM.freezePauseStage?.setAttribute("aria-hidden", String(activeStage !== "freeze-pause"));
  DOM.dailyCheckinStage?.setAttribute("aria-hidden", String(activeStage !== "daily-checkin"));
  DOM.manualEntryStage?.setAttribute("aria-hidden", String(activeStage !== "manual-entry"));
  DOM.attendanceReportsStage?.setAttribute("aria-hidden", String(activeStage !== "attendance-reports"));
  DOM.paymentsStage?.setAttribute("aria-hidden", String(activeStage !== "payments"));
  DOM.pendingDuesStage?.setAttribute("aria-hidden", String(activeStage !== "pending-dues"));
  DOM.paymentHistoryStage?.setAttribute("aria-hidden", String(activeStage !== "payment-history"));
  DOM.generateReceiptStage?.setAttribute("aria-hidden", String(activeStage !== "generate-receipt"));
  DOM.renewMembershipStage?.setAttribute("aria-hidden", String(activeStage !== "renew-membership"));
  DOM.trainersStage?.setAttribute("aria-hidden", String(activeStage !== "trainers"));
  DOM.assignTrainerStage?.setAttribute("aria-hidden", String(activeStage !== "assign-trainer"));
  DOM.trainerScheduleStage?.setAttribute("aria-hidden", String(activeStage !== "trainer-schedule"));
  DOM.staffRolesStage?.setAttribute("aria-hidden", String(activeStage !== "staff-roles"));
  DOM.ptClientsStage?.setAttribute("aria-hidden", String(activeStage !== "personal-training"));
  DOM.ptPackagesStage?.setAttribute("aria-hidden", String(activeStage !== "pt-packages"));
  DOM.sessionTrackingStage?.setAttribute("aria-hidden", String(activeStage !== "session-tracking"));
  DOM.trainerEarningsStage?.setAttribute("aria-hidden", String(activeStage !== "trainer-earnings"));
  DOM.notifyMembersStage?.setAttribute("aria-hidden", String(activeStage !== "notify-members"));
  DOM.revenueReportsStage?.setAttribute("aria-hidden", String(activeStage !== "revenue-reports"));
  DOM.attendanceAnalyticsStage?.setAttribute("aria-hidden", String(activeStage !== "attendance-analytics"));
  DOM.memberGrowthStage?.setAttribute("aria-hidden", String(activeStage !== "member-growth"));
  DOM.trainerPerformanceStage?.setAttribute("aria-hidden", String(activeStage !== "trainer-performance"));
  DOM.gymProfileStage?.setAttribute("aria-hidden", String(activeStage !== "gym-profile"));
  DOM.appSettingsStage?.setAttribute("aria-hidden", String(activeStage !== "app-settings"));
  DOM.backupRestoreStage?.setAttribute("aria-hidden", String(activeStage !== "backup-restore"));
  DOM.syncStatusStage?.setAttribute("aria-hidden", String(activeStage !== "sync-status"));
  DOM.profileStage?.setAttribute("aria-hidden", String(activeStage !== "profile"));
  DOM.memberDocumentsStage?.setAttribute("aria-hidden", String(activeStage !== "member-documents"));
  DOM.idProofsStage?.setAttribute("aria-hidden", String(activeStage !== "id-proofs"));
  DOM.agreementsStage?.setAttribute("aria-hidden", String(activeStage !== "agreements"));
  DOM.pastMembersStage?.setAttribute("aria-hidden", String(activeStage !== "past-members"));
  comingSoonStage?.setAttribute("aria-hidden", String(activeStage !== "coming-soon"));};

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

const matchesMemberFilter = (card) => {
  if (activeMemberFilter === "verified") {
    return card.dataset.memberStatus === "verified";
  }

  if (activeMemberFilter === "recent") {
    return card.dataset.memberRecent === "true";
  }

  return true;
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

  const memberCards = getMemberRows();

  if (!memberCards.length) {
    if (paginationContainer) paginationContainer.style.display = "none";
    return;
  }

  const query = memberSearchInput?.value.trim().toLowerCase() || "";
  
  // 1. Filter all members first
  const filteredMembers = memberCards.filter((card) => {
    const searchableContent = card.dataset.search || "";
    return (!query || searchableContent.includes(query)) && matchesMemberFilter(card);
  });

  const visibleCount = filteredMembers.length;

  // 2. Hide all cards first
  memberCards.forEach(card => card.hidden = true);

  const start = (currentMembersPage - 1) * MEMBERS_PER_PAGE;
  const end = start + MEMBERS_PER_PAGE;
  const pageMembers = filteredMembers.slice(start, end);

  pageMembers.forEach(card => card.hidden = false);

  if (memberCount) {
    memberCount.textContent = `${visibleCount} ${visibleCount === 1 ? "profile" : "profiles"}`;
  }

  if (membersEmptyState) {
    membersEmptyState.hidden = visibleCount !== 0;
  }

  // 4. Update UI controls
  renderPaginationControls(visibleCount);
  updateMemberStats();
};

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

  const isComingSoon = !["dashboard", "members", "membership-plans",
      "expiring-memberships", "freeze-pause", "daily-checkin", "attendance", "manual-entry",
      "attendance-reports", "payments", "pending-dues", "payment-history", "generate-receipt", "renew-membership", "trainers", "assign-trainer", "trainer-schedule", "staff-roles", "personal-training", "pt-packages", "session-tracking", "trainer-earnings", "notify-members", "revenue-reports", "attendance-analytics", "member-growth", "trainer-performance", "gym-profile", "app-settings", "backup-restore", "sync-status", "account", "documents", "id-proofs", "agreements", "past-members"].includes(safeView);
  const activeStage = isComingSoon ? "coming-soon" :
    (safeView === "membership-plans" ? "membership-plans" :
     safeView === "attendance" ? "daily-checkin" : 
     safeView === "app-settings" ? "app-settings" :
     safeView === "backup-restore" ? "backup-restore" :
     safeView === "sync-status" ? "sync-status" :
     safeView === "account" ? "profile" :
     safeView === "documents" ? "member-documents" : safeView);

  setStageVisibility(activeStage);
  if (safeView === "members") {
    loadMembersFromBackend();
    updateMemberResults();
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

const hideDeletedMembersInAllViews = () => {
  const deletedIds = getDeletedMemberIds();
  const memberCards = Array.from(document.querySelectorAll("[data-member-card][data-member-id]"));

  memberCards.forEach((card) => {
    const memberId = card.dataset.memberId;
    card.hidden = memberId ? deletedIds.has(memberId) : card.hidden;
  });

  updateMemberResults();
};

const loadMembersFromBackend = async () => {
  if (!window.__TAURI__) return;

  try {
    const members = await window.__TAURI__.core.invoke("get_members_command", { limit: 100, offset: 0 });
    console.log(`GymDeck: Loaded ${members.length} members from backend.`);
    
    if (membersTableBody) {
      membersTableBody.innerHTML = "";
      members.forEach(m => {
        // Map Rust Member back to frontend format for createMemberRow
        const frontendMember = {
          name: m.full_name,
          contactNumber: m.phone,
          alternateContact: m.alternate_phone || "",
          email: m.email || "",
          dobValue: m.dob || "",
          dobDisplay: formatDisplayDate(m.dob),
          height: m.height || "",
          weight: m.weight || "",
          address: m.address || "",
          docsLabel: m.notes || "",
          joiningDateValue: m.joined_at.split('T')[0],
          joiningTimeValue: m.joined_at.split('T')[1]?.slice(0, 5) || "00:00",
          joiningDateDisplay: formatJoinDateDisplay(new Date(m.joined_at)),
          joiningTimeDisplay: formatJoinTimeDisplay(new Date(m.joined_at)),
          photoUrl: m.profile_photo_path || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.full_name || "GymDeckMember")}`
        };
        
        const row = createMemberRow(frontendMember);
        row.dataset.memberId = m.id;
        membersTableBody.appendChild(row);
      });
      
      updateMemberAges();
      updateMemberResults();
      updateMemberStats();
      hideDeletedMembersInAllViews();
    }
  } catch (err) {
    console.error("GymDeck: Error loading members from database:", err);
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

// ESC Key Listener for all modals
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (document.body.classList.contains("verification-modal-open")) {
      setVerificationModalState(false);
    } else if (document.body.classList.contains("document-modal-open")) {
      setDocumentModalState(false);
    } else if (document.body.classList.contains("logout-dialog-open")) {
      setLogoutDialogState(false);
    } else if (document.body.classList.contains("member-form-open")) {
      setAddMemberModalState(false);
    } else if (document.getElementById("moreOptionsModal")?.classList.contains("is-active")) {
      setMoreOptionsModalState(false);
    }
  }
});

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
    clearMemberFormErrors();
    setAddMemberModalState(true, button);
  });
});

addMemberBackdrop?.addEventListener("click", () => {
  setAddMemberModalState(false);
});

// Member photo upload selectors
const photoUploadInput = document.querySelector("[data-member-photo-input]");
const photoUploadPreview = document.querySelector("[data-member-photo-preview]");
const photoPlaceholder = document.querySelector(".photo-placeholder-icon");
const photoUploadTriggers = Array.from(document.querySelectorAll("[data-member-photo-trigger]"));
const photoUploadBackButton = document.querySelector("[data-photo-upload-back]");
const photoUploadNextButton = document.querySelector("[data-photo-upload-next]");

photoUploadTriggers.forEach(trigger => {
    trigger.addEventListener("click", () => photoUploadInput?.click());
});

photoUploadInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const optimizedFile = await compressImage(file);
        const objectUrl = URL.createObjectURL(optimizedFile);
        const base64 = await fileToBase64(optimizedFile);
        
        if (photoUploadPreview) {
            photoUploadPreview.src = objectUrl;
            photoUploadPreview.hidden = false;
        }
        if (photoPlaceholder) photoPlaceholder.style.display = "none";

        // Show the Change Photo button
        const changePhotoBtn = document.querySelector("[data-photo-change-btn]");
        if (changePhotoBtn) changePhotoBtn.classList.add("is-visible");

        // Store in global pending state
        if (pendingMemberData) {
            pendingMemberData.photoUrl = objectUrl;
            pendingMemberData.photoBase64 = base64;
        }
    } catch (err) {
        console.error("GymDeck: Photo upload failed:", err);
    }
});

photoUploadBackButton?.addEventListener("click", () => {
    addMemberModal?.classList.remove("is-page-2");
});

photoUploadNextButton?.addEventListener("click", () => {
    addMemberModal?.classList.remove("is-page-2");
    setDocUploadModalState(true, pendingMemberData?.name || "Member");
});

addMemberCloseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    clearMemberFormErrors();
    setAddMemberModalState(false);
  });
});

docUploadBackButton?.addEventListener("click", () => {
  addMemberModal?.classList.add("is-page-2");
  addMemberModal?.classList.remove("is-page-3");
});

docUploadNextButton?.addEventListener("click", () => {
  addMemberModal?.classList.remove("is-page-3");
  addMemberModal?.classList.add("is-page-4");
});

planningBackButton?.addEventListener("click", () => {
  addMemberModal?.classList.add("is-page-3");
  addMemberModal?.classList.remove("is-page-4");
});

addMemberUploadTriggers.forEach((button) => {
  button.addEventListener("click", () => {
    const wrapper = button.closest(".member-upload") || button.closest(".doc-upload-card-actions");
    wrapper?.querySelector("[data-member-upload-input], [data-doc-upload-input]")?.click();
  });
});

addMemberUploadInputs.forEach((input) => {
  input.addEventListener("change", () => {
    syncUploadMeta(input);
    syncUploadPreview(input);
    const field = input.closest(".member-field");
    if (field) setFieldErrorState(field, "");

    if (addMemberFormAlert && !validateMemberForm().length) {
      addMemberFormAlert.hidden = true;
      addMemberFormAlert.textContent = "";
    }
  });
});

addMemberUploadRemoveButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const wrapper = button.closest(".member-upload") || button.closest(".doc-upload-card-actions");
    const input = wrapper?.querySelector("[data-member-upload-input], [data-doc-upload-input]");
    if (input) {
      input.value = "";
      clearUploadPreview(input);
      syncUploadMeta(input);
    }
  });
});

addMemberDobTrigger?.addEventListener("click", () => {
  const selectedDate = parseCalendarValue(addMemberDobInput?.value || "");
  activeCalendarDate = selectedDate || activeCalendarDate || new Date();
  datePickerMode = "day";
  renderDatePicker();
  openDatePicker();
});

addMemberDobDisplay?.addEventListener("click", () => {
  addMemberDobTrigger?.click();
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

docUploadSaveButton?.addEventListener("click", async () => {
  if (!pendingMemberData) {
    setAddMemberModalState(false);
    return;
  }

  // Enterprise Backend Integration: Persist to encrypted SQLite
  if (window.__TAURI__) {
    if (docUploadSaveButton) {
      docUploadSaveButton.setAttribute("disabled", "true");
      docUploadSaveButton.textContent = "Saving...";
    }

    try {
      const memberCode = `GD-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Collect all documents from the unified inputs
      const uploadedDocs = [];
      addMemberUploadInputs.forEach((input) => {
        const data = uploadPreviewUrls.get(input);
        if (data) {
          const field = input.closest(".member-field");
          const card = input.closest(".doc-upload-card");
          const labelInput = field?.querySelector("input[type='text']");
          const strongLabel = card?.querySelector("strong");
          
          uploadedDocs.push({
            label: labelInput?.value || strongLabel?.textContent || input.dataset.uploadLabel || input.dataset.docUploadInput || "Document",
            base64: data.base64Data
          });
        }
      });

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
        gender: "OTHER",
        dob: pendingMemberData.dobValue || new Date().toISOString().split('T')[0],
        address: pendingMemberData.address,
        height: pendingMemberData.height,
        weight: pendingMemberData.weight,
        membership_plan_id: null,
        membership_status: "ACTIVE",
        joined_at: new Date().toISOString(),
        expires_at: null,
        profile_photo_path: pendingMemberData.photoUrl,
        notes: uploadedDocs.map(d => d.label).join(", "),
        created_by_user_id: "00000000-0000-0000-0000-000000000000",
        updated_by_user_id: "00000000-0000-0000-0000-000000000000",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        deleted_by_user_id: null
      };

      // Map Documents for Rust Persistence
      const rustDocs = uploadedDocs.map(d => ({
        id: crypto.randomUUID(),
        member_id: memberId,
        gym_id: gymId,
        doc_name: d.label,
        doc_type: d.label.toLowerCase().includes("aadhaar") ? "id" : "residence",
        file_content: dataUrlToBytes(d.base64),
        file_size: "1.2 MB",
        upload_date: new Date().toISOString(),
        status: "verified"
      }));

      await window.__TAURI__.core.invoke("create_member_command", { 
        member: rustMember,
        documents: rustDocs
      });
      
      console.log(`GymDeck: Member & ${rustDocs.length} Documents successfully persisted to SQLite.`);

      // Update Local Session Registry so documents are immediately visible without a re-fetch
      if (rustDocs.length > 0) {
          const sessionDocs = rustDocs.map(d => ({
              id: d.id,
              name: d.doc_name,
              status: d.status,
              date: new Date(d.upload_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              size: d.file_size,
              url: bytesToDataUrl(d.file_content)
          }));
          memberDocsRegistry.set(memberId, sessionDocs);
          memberDocsRegistry.set(rustMember.full_name, sessionDocs);
      }

      await loadMembersFromBackend();
      
      resetMemberForm();
      resetUploadFields();
      pendingMemberData = null;
      setAddMemberModalState(false);
      setActiveView("members");
    } catch (err) {
      console.error("GymDeck: Failed to save:", err);
      if (docUploadAlert) {
        docUploadAlert.textContent = `Error: ${err}`;
        docUploadAlert.hidden = false;
      }
    } finally {
      if (docUploadSaveButton) {
        docUploadSaveButton.removeAttribute("disabled");
        docUploadSaveButton.textContent = "Save & Finish";
      }
    }
    return;
  }

  // Fallback for non-tauri environments
  const newRow = createMemberRow(pendingMemberData);
  membersTableBody?.prepend(newRow);
  updateMemberStats();
  updateMemberResults();
  resetMemberForm();
  resetUploadFields();
  pendingMemberData = null;
  setAddMemberModalState(false);
  setActiveView("members");
});

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
    updateMemberResults(false);
    const membersTableWrap = document.querySelector(".members-table-wrap");
    if (membersTableWrap) membersTableWrap.scrollTop = 0;
  }
});

paginationNext?.addEventListener("click", () => {
  const memberCards = getMemberRows();
  const query = memberSearchInput?.value.trim().toLowerCase() || "";
  const totalMatches = memberCards.filter((card) => {
    const searchableContent = card.dataset.search || "";
    return (!query || searchableContent.includes(query)) && matchesMemberFilter(card);
  }).length;
  const totalPages = Math.ceil(totalMatches / MEMBERS_PER_PAGE);

  if (currentMembersPage < totalPages) {
    currentMembersPage++;
    updateMemberResults(false);
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

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!addMemberDatePickerPanel?.hidden) {
      closeDatePicker();
      return;
    }

    if (document.body.classList.contains("doc-upload-open")) {
      setDocUploadModalState(false);
      return;
    }

    if (document.body.classList.contains("member-form-open")) {
      setAddMemberModalState(false);
      return;
    }

    if (document.body.classList.contains("document-modal-open")) {
      setDocumentModalState(false);
      return;
    }

    if (document.body.classList.contains("logout-dialog-open")) {
      setLogoutDialogState(false);
      return;
    }

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
      updateMemberResults();
      
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
  pendingDeleteReason = formData.get('delete_reason') || "Cancelled";
  pendingDeleteFeedback = offboardingForm.querySelector('textarea')?.value || "";
  
  console.log(`GymDeck: Offboarding captured. Reason: ${pendingDeleteReason}, Feedback: ${pendingDeleteFeedback}`);
  
  // Instantly show confirmation modal over the current offboarding modal
  setDeleteConfirmState(true);
});

resetUploadFields();
