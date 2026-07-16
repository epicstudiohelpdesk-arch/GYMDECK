import "./styles.css";
import { mountIntroScreen } from "./IntroScreen.jsx";

let authErrorTimeout = null;

// Helper to check for 3 consecutive ascending or descending digits (e.g. 123, 321)
const hasSequentialDigits = (str) => {
  for (let i = 0; i <= str.length - 3; i++) {
    const c1 = str.charCodeAt(i);
    const c2 = str.charCodeAt(i + 1);
    const c3 = str.charCodeAt(i + 2);
    
    // Check if all three characters are digits (0-9)
    if (c1 >= 48 && c1 <= 57 && c2 >= 48 && c2 <= 57 && c3 >= 48 && c3 <= 57) {
      if (c2 === c1 + 1 && c3 === c2 + 1) return true; // ascending (123)
      if (c2 === c1 - 1 && c3 === c2 - 1) return true; // descending (321)
    }
  }
  return false;
};

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

// Observer for dynamically mounted React components or DOM nodes
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

// Restrict phone number inputs globally to digits only and max 10 length
document.addEventListener('input', (e) => {
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'tel') {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value.length > 10) {
      e.target.value = e.target.value.slice(0, 10);
    }
  }
});

// Initializing the app with the Intro sequence on launch or logout
const initIntro = async () => {
  const authPage = document.querySelector(".auth-page");
  const introShown = sessionStorage.getItem("gymdeck-intro-shown");
  const enterMode = sessionStorage.getItem("gymdeck-enter");
  
  // Attempt to restore native Tauri session if we did not just logout
  const isLoginPage = window.location.pathname.endsWith("/index.html") || 
                      window.location.pathname.endsWith("/") || 
                      window.location.pathname === "";

  if (enterMode !== "logout" && isLoginPage && window.__TAURI__) {
    try {
      const response = await window.__TAURI__.core.invoke("restore_session_command");
      if (response && response.success) {
        console.log("Active OS keychain session restored successfully. Redirecting to dashboard...");
        sessionStorage.setItem("gymdeck-authenticated", "true");
        const redirectPath = window.location.pathname.includes("/authentication/") 
          ? "../frontend/index.html" 
          : "./frontend/index.html";
        window.location.replace(redirectPath);
        return;
      }
    } catch (error) {
      console.log("No active OS keychain session to restore:", error);
    }
  }

  // Only show intro if:
  // 1. First time in this session (introShown is null)
  const shouldShowIntro = !introShown;

  if (shouldShowIntro) {
    const triggerIntro = () => {
      mountIntroScreen(() => {
        sessionStorage.setItem("gymdeck-intro-shown", "true");
        sessionStorage.removeItem("gymdeck-enter");
        
        document.documentElement.classList.remove("app-loading");
        document.documentElement.style.backgroundColor = "";
        
        if (authPage) {
          authPage.classList.remove("is-loading");
          document.documentElement.classList.add("auth-enter-active");
        }
      });
    };

    if (document.visibilityState === "visible") {
      triggerIntro();
    } else {
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          triggerIntro();
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
  } else {
    // Skip intro: immediately reveal the auth page
    document.documentElement.classList.remove("app-loading");
    document.documentElement.style.backgroundColor = "";
    
    if (authPage) {
      // Add auth-enter FIRST so opacity: 0 is guaranteed before is-loading comes off
      document.documentElement.classList.add("auth-enter");

      requestAnimationFrame(() => {
        authPage.classList.remove("is-loading");

        requestAnimationFrame(() => {
          document.documentElement.classList.add("auth-enter-active");
        });
      });
    }
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initIntro);
} else {
  initIntro();
}

const phoneTimeElements = document.querySelectorAll(".phone-time");

if (phoneTimeElements.length > 0) {
  const timeFormatter = new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const updatePhoneTime = () => {
    const currentTime = timeFormatter.format(new Date());
    phoneTimeElements.forEach((element) => {
      element.textContent = currentTime;
    });
  };

  const scheduleNextTimeUpdate = () => {
    const now = new Date();
    const delayUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    window.setTimeout(() => {
      updatePhoneTime();
      scheduleNextTimeUpdate();
    }, Math.max(250, delayUntilNextMinute));
  };

  updatePhoneTime();
  scheduleNextTimeUpdate();
}

const toggleButtons = document.querySelectorAll(".toggle-password");

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const input = button.parentElement?.querySelector("input");
    const inputWrap = button.closest(".input-wrap");

    if (!input) {
      return;
    }

    const nextType = input.type === "password" ? "text" : "password";
    const isPasswordVisible = nextType === "text";

    input.type = nextType;
    button.classList.toggle("is-active", isPasswordVisible);
    inputWrap?.classList.toggle("password-visible", isPasswordVisible);
    button.setAttribute("aria-pressed", String(isPasswordVisible));
    button.setAttribute("aria-label", isPasswordVisible ? "Hide password" : "Show password");
    button.setAttribute("title", isPasswordVisible ? "Hide password" : "Show password");
  });
});

const otpSlots = Array.from(document.querySelectorAll(".otp-slot"));

otpSlots.forEach((slot, index) => {
  slot.addEventListener("input", () => {
    slot.value = slot.value.replace(/\D/g, "").slice(0, 1);

    if (slot.value && index < otpSlots.length - 1) {
      otpSlots[index + 1].focus();
      otpSlots[index + 1].select();
    }
  });

  slot.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !slot.value && index > 0) {
      otpSlots[index - 1].focus();
    }
  });
});

/* 
// Handled by IntroScreen completion callback
if (document.documentElement.classList.contains("auth-enter")) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.add("auth-enter-active");
      window.setTimeout(() => {
        sessionStorage.removeItem("gymdeck-enter");
      }, 560);
    });
  });
}
*/

const isAuthDestination = (destination) => {
  if (!destination) {
    return false;
  }

  try {
    const url = new URL(destination, window.location.href);
    return url.origin === window.location.origin && url.pathname.includes("/authentication/");
  } catch {
    return false;
  }
};

const isDashboardDestination = (destination) => {
  if (!destination) {
    return false;
  }

  const destLower = destination.toLowerCase();
  return destLower.includes("frontend") || destLower.includes("dashboard");
};

const navigateWithTransition = (destination, enterState, trigger) => {
  if (!destination) {
    return;
  }

  const resolvedEnterState = enterState || (isAuthDestination(destination) ? "auth" : "");

  if (isDashboardDestination(destination)) {
    sessionStorage.setItem("gymdeck-authenticated", "true");
    localStorage.removeItem("gymdeck-authenticated");
  }

  if (resolvedEnterState) {
    sessionStorage.setItem("gymdeck-enter", resolvedEnterState);
  } else {
    sessionStorage.removeItem("gymdeck-enter");
  }

  if (trigger instanceof HTMLButtonElement) {
    trigger.setAttribute("disabled", "true");

    if (trigger.type === "submit") {
      trigger.textContent = "Please wait...";
    }
  }

  document.body.classList.add("is-transitioning");

  window.setTimeout(() => {
    window.location.href = destination;
  }, 100);
};

document.querySelectorAll("form[data-redirect]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const destination = form.getAttribute("data-redirect") || form.getAttribute("action");
    const enterState = form.getAttribute("data-enter-state");
    const submitButton = form.querySelector(".primary-btn");

    // Enterprise Backend Integration (Signup & Login)
    if (form.classList.contains("auth-form") || form.closest(".auth-page-signup")) {
      const emailInput = form.querySelector('input[type="email"]');
      // Robust selection: find password input even if toggled to type="text"
      const passwordInput = form.querySelector('input[type="password"]') || 
                           form.querySelector('input[placeholder*="password"]');
      const nameInput = form.querySelector('input[type="text"][placeholder*="Full Name"]');
      const gymNameInput = form.querySelector('input[type="text"][placeholder*="Gym Name"]'); // may be null
      const phoneInput = form.querySelector('input[type="tel"]');
      
      const isSignup = form.closest(".auth-page-signup") !== null;

      // Utility to inject inline errors into placeholders and trigger shake
      const clearErrors = () => {
        if (authErrorTimeout) {
          clearTimeout(authErrorTimeout);
          authErrorTimeout = null;
        }
        form.querySelectorAll('.form-error-message').forEach(el => {
          el.classList.remove('is-visible');
          setTimeout(() => el.remove(), 250);
        });
        form.querySelectorAll('.remember-me-checkbox').forEach(el => {
          el.classList.remove('is-hidden');
        });
        form.querySelectorAll('.field.has-error').forEach(el => {
          el.classList.remove('has-error');
          const input = el.querySelector('input');
          if (input && input.dataset.originalPlaceholder) {
            input.placeholder = input.dataset.originalPlaceholder;
          }
        });
      };

      const showError = (inputEl, message) => {
        const fieldWrap = inputEl.closest('.field');
        if (!fieldWrap) return;
        
        // Store original placeholder if not already saved
        if (!inputEl.dataset.originalPlaceholder) {
          inputEl.dataset.originalPlaceholder = inputEl.placeholder;
        }

        fieldWrap.classList.add('has-error');
        inputEl.placeholder = message;
        inputEl.value = ""; // Clear any partial/invalid input so placeholder shows

        // Trigger shake animation
        fieldWrap.classList.remove('input-shake');
        // Force reflow to restart animation
        void fieldWrap.offsetWidth;
        fieldWrap.classList.add('input-shake');
      };

      const showLoginError = (errorMessage) => {
        clearErrors();

        // Highlight + shake email and password fields on auth failure
        [emailInput, passwordInput].forEach(input => {
          if (input) {
            const fieldWrap = input.closest('.field');
            if (fieldWrap) {
              fieldWrap.classList.add('has-error');
              fieldWrap.classList.remove('input-shake');
              void fieldWrap.offsetWidth;
              fieldWrap.classList.add('input-shake');
            }
          }
        });

        // Hide remember me checkbox
        form.querySelectorAll('.remember-me-checkbox').forEach(el => {
          el.classList.add('is-hidden');
        });

        // Display error inside remember-me-wrap
        const wrap = form.querySelector('.remember-me-wrap');
        if (wrap) {
          const errorEl = document.createElement('div');
          errorEl.className = 'form-error-message';
          errorEl.textContent = errorMessage;
          wrap.appendChild(errorEl);
          
          // Force reflow and add class for transition
          void errorEl.offsetWidth;
          errorEl.classList.add('is-visible');
        }

        if (submitButton) {
          submitButton.removeAttribute("disabled");
          submitButton.textContent = isSignup ? "Sign up" : "Sign in";
        }

        // Auto-clear after 1.3 seconds
        authErrorTimeout = setTimeout(() => {
          clearErrors();
        }, 1300);
      };

      // In Tauri v2, window.__TAURI_INTERNALS__ is sometimes the global.
      // The safest way is to check window.__TAURI__ existence.
      if (!window.__TAURI__) {
          console.warn("Tauri environment not detected. Native authentication requires the desktop app.");
          showLoginError("Native backend disconnected.");
          return;
      }

      if (emailInput && passwordInput) {
        clearErrors();
        let hasErrors = false;

        // --- Frontend Validation ---
        if (isSignup) {
          if (!nameInput?.value.trim()) {
            showError(nameInput, "Full name required");
            hasErrors = true;
          }
          if (!emailInput.value.trim()) {
            showError(emailInput, "Valid email required");
            hasErrors = true;
          }
          if (phoneInput && !phoneInput.value.trim()) {
            showError(phoneInput, "Phone number required");
            hasErrors = true;
          }
          if (!passwordInput.value.trim()) {
            showError(passwordInput, "Password required");
            hasErrors = true;
          } else if (passwordInput.value.length < 6) {
            showError(passwordInput, "Password must be at least 6 characters");
            hasErrors = true;
          } else if (hasSequentialDigits(passwordInput.value)) {
            showError(passwordInput, "Sequential numbers (e.g. 123) not allowed");
            hasErrors = true;
          }
        } else {
          if (!emailInput.value.trim()) {
            showError(emailInput, "Email required");
            hasErrors = true;
          }
          if (!passwordInput.value.trim()) {
            showError(passwordInput, "Password required");
            hasErrors = true;
          }
        }

        if (hasErrors) return; // Halt execution without alerting
        // ---------------------------

        if (submitButton) {
          submitButton.setAttribute("disabled", "true");
          submitButton.textContent = isSignup ? "Creating Account..." : "Authenticating...";
        }

        try {
          // Keep a temporary copy of the remember keys and stored accounts before purge
          const tempStoredAccounts = localStorage.getItem('gymdeck_stored_accounts');
          const tempRememberedEmail = localStorage.getItem('gymdeck_remembered_email');
          const tempRememberExpires = localStorage.getItem('gymdeck_remember_expires');

          // Hard Purge of old business mock data on any login/signup transition
          window.localStorage.clear();

          // Restore them immediately back to localStorage
          if (tempStoredAccounts) {
            localStorage.setItem('gymdeck_stored_accounts', tempStoredAccounts);
          }
          if (tempRememberedEmail) {
            localStorage.setItem('gymdeck_remembered_email', tempRememberedEmail);
          }
          if (tempRememberExpires) {
            localStorage.setItem('gymdeck_remember_expires', tempRememberExpires);
          }

          let response;
          if (isSignup && nameInput) {
            // Generate a default gym name based on the user's name
            const defaultGymName = nameInput.value ? `${nameInput.value.trim()}'s Gym` : "My Gym";

            // Invoke the native Rust Signup engine
            response = await window.__TAURI__.core.invoke("signup_command", {
              payload: {
                gym_name: defaultGymName,
                name: nameInput.value,
                email: emailInput.value,
                password: passwordInput.value
              }
            });
          } else {
            // Invoke the native Rust Login engine
            response = await window.__TAURI__.core.invoke("login_command", {
              payload: {
                email: emailInput.value,
                password: passwordInput.value
              }
            });
          }
          
          if (response.success) {
             if (isSignup) {
                 // Save the signup account's credentials to device storage
                 const accountsStr = localStorage.getItem('gymdeck_stored_accounts') || '{}';
                 let accounts = {};
                 try { accounts = JSON.parse(accountsStr); } catch (e) {}
                 accounts[emailInput.value.trim().toLowerCase()] = passwordInput.value;
                 localStorage.setItem('gymdeck_stored_accounts', JSON.stringify(accounts));

                 // Deactivate remember me for the previous account
                 localStorage.removeItem('gymdeck_remembered_email');
                 localStorage.removeItem('gymdeck_remember_expires');

                 // For signup, we transition to login page
                 navigateWithTransition("./index.html", "auth", submitButton);
             } else {
                 // Save the signin account's credentials to device storage (always keep it updated)
                 const accountsStr = localStorage.getItem('gymdeck_stored_accounts') || '{}';
                 let accounts = {};
                 try { accounts = JSON.parse(accountsStr); } catch (e) {}
                 accounts[emailInput.value.trim().toLowerCase()] = passwordInput.value;
                 localStorage.setItem('gymdeck_stored_accounts', JSON.stringify(accounts));

                 const rememberCheckbox = form.querySelector('#remember');
                 if (rememberCheckbox && rememberCheckbox.checked) {
                   localStorage.setItem('gymdeck_remembered_email', emailInput.value.trim().toLowerCase());
                   localStorage.setItem('gymdeck_remember_expires', (Date.now() + 3 * 24 * 60 * 60 * 1000).toString());
                 }
                 navigateWithTransition(destination, enterState, submitButton);
             }
          }
        } catch (error) {
          // Backend returns a generic safe error string
          console.error("Native Auth Error:", error);
          const errMsg = typeof error === 'string' ? error.replace(/^Authentication Error:\s*/i, '') : 'Sign in failed.';
          showLoginError(errMsg);
        }
        return;
      }
    }

    const hasPassword = !!form.querySelector('input[type="password"]') || 
                        !!form.querySelector('input[placeholder*="password"]');

    // Only allow fallback navigation if it's NOT an auth form, or it has no password (e.g. forgot password)
    if ((!form.classList.contains("auth-form") || !hasPassword) && form.closest(".auth-page-signup") === null) {
      navigateWithTransition(destination, enterState, submitButton);
    }
  });
});

document.querySelectorAll("button[data-redirect]").forEach((button) => {
  button.addEventListener("click", (event) => {
    const destination = button.getAttribute("data-redirect");
    const enterState = button.getAttribute("data-enter-state");

    navigateWithTransition(destination, enterState, button);
  });
});

document.querySelectorAll("a[href]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      link.target === "_blank" ||
      link.hasAttribute("download") ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const destination = link.getAttribute("href");

    if (!destination || destination.startsWith("#") || destination.startsWith("mailto:") || destination.startsWith("tel:")) {
      return;
    }

    event.preventDefault();
    navigateWithTransition(destination, link.getAttribute("data-enter-state"), link);
  });
});

// Handle Forgot Password Verification
const forgotForm = document.querySelector(".auth-page-forgot .auth-form");
if (forgotForm) {
  const emailInput = forgotForm.querySelector('input[type="email"]');
  const sendButton = forgotForm.querySelector(".primary-btn");

  const clearForgotErrors = () => {
    if (authErrorTimeout) {
      clearTimeout(authErrorTimeout);
      authErrorTimeout = null;
    }
    forgotForm.querySelectorAll('.form-error-message').forEach(el => {
      el.classList.remove('is-visible');
      setTimeout(() => {
        el.remove();
        const metaRow = forgotForm.querySelector('.meta-row');
        if (metaRow && !metaRow.querySelector('.form-error-message')) {
          metaRow.style.display = 'none';
        }
      }, 250);
    });
    const fieldWrap = emailInput?.closest('.field');
    if (fieldWrap) {
      fieldWrap.classList.remove('has-error');
    }
  };

  const showForgotError = (message) => {
    clearForgotErrors();

    const fieldWrap = emailInput?.closest('.field');
    if (fieldWrap) {
      fieldWrap.classList.add('has-error');
      fieldWrap.classList.remove('input-shake');
      void fieldWrap.offsetWidth;
      fieldWrap.classList.add('input-shake');
    }

    // Prepend error to meta-row
    const metaRow = forgotForm.querySelector('.meta-row');
    if (metaRow) {
      metaRow.style.display = 'block'; // Make sure meta-row is visible
      const errorEl = document.createElement('div');
      errorEl.className = 'form-error-message';
      errorEl.style.position = 'relative'; // static flow
      errorEl.textContent = message;
      metaRow.appendChild(errorEl);

      void errorEl.offsetWidth;
      errorEl.classList.add('is-visible');
    }

    if (sendButton) {
      sendButton.removeAttribute("disabled");
    }

    authErrorTimeout = setTimeout(() => {
      clearForgotErrors();
    }, 1300);
  };

  sendButton?.addEventListener("click", async (e) => {
    e.preventDefault();
    clearForgotErrors();

    const email = emailInput?.value.trim();
    if (!email) {
      showForgotError("Email address is required");
      return;
    }

    if (sendButton) {
      sendButton.setAttribute("disabled", "true");
    }

    if (!window.__TAURI__) {
      console.warn("Tauri backend not detected.");
      showForgotError("Native backend disconnected.");
      return;
    }

    try {
      const exists = await window.__TAURI__.core.invoke("check_email_exists_command", { email });
      if (!exists) {
        showForgotError("Email does not exist");
      } else {
        // Email exists! Proceed to OTP page
        if (sendButton) {
          sendButton.removeAttribute("disabled");
        }
        const destination = forgotForm.getAttribute("action") || "./otp.html";
        navigateWithTransition(destination, "auth", sendButton);
      }
    } catch (err) {
      console.error("Check email error:", err);
      showForgotError("Verification failed.");
    }
  });
}

// --- Remember Me Auto-Fill & Disclaimer Modal ---

// Global to track checkbox state before showing modal
let previousCheckedState = false;

const createRememberModal = () => {
  if (document.getElementById('remember-me-modal')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'remember-me-modal';
  backdrop.className = 'remember-modal-backdrop';

  backdrop.innerHTML = `
    <div class="remember-modal-card">
      <div class="remember-modal-header">
        <h3 class="remember-modal-title">Terms and Conditions</h3>
        <p class="remember-modal-subtitle">Your Agreement</p>
      </div>
      <div class="remember-modal-content">
        <p class="remember-modal-intro">Welcome to GymDeck. By using our Remember Me feature, you agree to the following terms and conditions:</p>
        
        <h4 class="remember-modal-section-title">1. Automated Detection</h4>
        <p class="remember-modal-section-text">Once enabled and after a successful sign-in, your email and password credentials will be securely autodetected and autofilled inside the area for 3 days / 72 hours.</p>
        
        <h4 class="remember-modal-section-title">2. Direct Dashboard Entry</h4>
        <p class="remember-modal-section-text">You won't need to re-enter your credentials. You can simply click the sign-in button and continue directly to your GymDeck dashboard.</p>
        
        <h4 class="remember-modal-section-title">3. Security Disclaimer</h4>
        <p class="remember-modal-section-text">Any person with access to this device may be able to sign in to your account. Please use this feature only on trusted, secure, and private personal devices, be cautious.</p>
      </div>
      <div class="remember-modal-actions">
        <button type="button" class="remember-modal-btn remember-modal-btn-cancel" id="remember-modal-cancel">Reject</button>
        <button type="button" class="remember-modal-btn remember-modal-btn-confirm" id="remember-modal-accept">Agree</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const checkbox = document.getElementById('remember');

  const closeWithAccept = () => {
    backdrop.classList.remove('is-active');
    if (checkbox) checkbox.checked = true;
  };

  const closeWithCancel = () => {
    backdrop.classList.remove('is-active');
    if (checkbox) checkbox.checked = previousCheckedState;
  };

  document.getElementById('remember-modal-accept').addEventListener('click', closeWithAccept);
  document.getElementById('remember-modal-cancel').addEventListener('click', closeWithCancel);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      closeWithCancel();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('is-active')) {
      closeWithCancel();
    }
  });
};

const initRememberMeFeature = () => {
  const checkbox = document.getElementById('remember');
  const emailInput = document.querySelector('.auth-form input[type="email"]');
  const passwordInput = document.querySelector('.auth-form input[type="password"]') || 
                        document.querySelector('.auth-form input[placeholder*="password"]');
  
  if (!checkbox) return;

  createRememberModal();

  const backdrop = document.getElementById('remember-me-modal');

  // Helper to autofill password if email exists in stored accounts
  const checkAndAutofillPassword = () => {
    if (!emailInput || !passwordInput) return;
    const emailVal = emailInput.value.trim().toLowerCase();
    if (!emailVal) return;

    const accountsStr = localStorage.getItem('gymdeck_stored_accounts') || '{}';
    let accounts = {};
    try { accounts = JSON.parse(accountsStr); } catch (e) {}

    if (accounts[emailVal]) {
      passwordInput.value = accounts[emailVal];
    }
  };

  checkbox.addEventListener('change', function() {
    if (!this.checked) {
      localStorage.removeItem('gymdeck_remembered_email');
      localStorage.removeItem('gymdeck_remember_expires');
    } else {
      // If checked, autofill password if email is recognized on device
      checkAndAutofillPassword();
    }
  });

  // As the user types their email, check if it matches a stored account. If remember is checked, autofill password!
  if (emailInput) {
    const handleEmailInput = () => {
      if (checkbox && checkbox.checked) {
        checkAndAutofillPassword();
      }
    };
    emailInput.addEventListener('input', handleEmailInput);
    emailInput.addEventListener('change', handleEmailInput);
    emailInput.addEventListener('blur', handleEmailInput);
  }

  // Trigger modal when clicking (T&C apply) link
  const tcLink = document.getElementById('tc-link');
  if (tcLink && backdrop) {
    tcLink.addEventListener('click', (e) => {
      e.preventDefault();
      previousCheckedState = checkbox.checked; // Capture current state
      backdrop.classList.add('is-active');
      const confirmBtn = document.getElementById('remember-modal-accept');
      if (confirmBtn) {
        setTimeout(() => confirmBtn.focus(), 100);
      }
    });
  }
};

const autofillRememberedCredentials = () => {
  const emailInput = document.querySelector('.auth-form input[type="email"]');
  const passwordInput = document.querySelector('.auth-form input[type="password"]') || 
                        document.querySelector('.auth-form input[placeholder*="password"]');
  const checkbox = document.getElementById('remember');

  if (!emailInput || !passwordInput || !checkbox) return;

  const rememberedEmail = localStorage.getItem('gymdeck_remembered_email');
  const expires = localStorage.getItem('gymdeck_remember_expires');

  if (rememberedEmail && expires) {
    if (Date.now() < Number(expires)) {
      const accountsStr = localStorage.getItem('gymdeck_stored_accounts') || '{}';
      let accounts = {};
      try { accounts = JSON.parse(accountsStr); } catch (e) {}

      if (accounts[rememberedEmail]) {
        emailInput.value = rememberedEmail;
        passwordInput.value = accounts[rememberedEmail];
        checkbox.checked = false;
      }
    } else {
      localStorage.removeItem('gymdeck_remembered_email');
      localStorage.removeItem('gymdeck_remember_expires');
    }
  }
};

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    autofillRememberedCredentials();
    initRememberMeFeature();
  });
} else {
  autofillRememberedCredentials();
  initRememberMeFeature();
}


