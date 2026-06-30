import "./styles.css";
import { mountIntroScreen } from "./IntroScreen.jsx";

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
      const gymNameInput = form.querySelector('input[type="text"][placeholder*="Gym Name"]');
      
      const isSignup = form.closest(".auth-page-signup") !== null;

      // Utility to inject inline errors into placeholders and trigger shake
      const clearErrors = () => {
        form.querySelectorAll('.form-error-message').forEach(el => el.remove());
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

      // In Tauri v2, window.__TAURI_INTERNALS__ is sometimes the global.
      // The safest way is to check window.__TAURI__ existence.
      if (!window.__TAURI__) {
          console.warn("Tauri environment not detected. Native authentication requires the desktop app.");
          
          clearErrors();
          if (submitButton && passwordInput) {
            const metaRow = submitButton.form.querySelector('.meta-row');
            const errorEl = document.createElement('div');
            errorEl.className = 'form-error-message';
            errorEl.textContent = 'Native backend disconnected.';
            if (metaRow) {
              metaRow.prepend(errorEl);
            }
          }
          return;
      }

      if (emailInput && passwordInput) {
        clearErrors();
        let hasErrors = false;

        // --- Frontend Validation ---
        if (isSignup) {
          if (!gymNameInput?.value.trim()) {
            showError(gymNameInput, "Gym Name required");
            hasErrors = true;
          }
          if (!nameInput?.value.trim()) {
            showError(nameInput, "Full name required");
            hasErrors = true;
          }
          if (!emailInput.value.trim()) {
            showError(emailInput, "Valid email required");
            hasErrors = true;
          }
          if (!passwordInput.value.trim()) {
            showError(passwordInput, "Password required");
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
          // Hard Purge of old business mock data on any login/signup transition
          window.localStorage.clear();

          let response;
          if (isSignup && nameInput && gymNameInput) {
            // Invoke the native Rust Signup engine
            response = await window.__TAURI__.core.invoke("signup_command", {
              payload: {
                gym_name: gymNameInput.value,
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
                 // For signup, we transition to login page
                 navigateWithTransition("./index.html", "auth", submitButton);
             } else {
                 navigateWithTransition(destination, enterState, submitButton);
             }
          }
        } catch (error) {
          // Backend returns a generic safe error string
          console.error("Native Auth Error:", error);
          
          clearErrors();
          
          // Highlight + shake email and password fields on auth failure
          if (!isSignup) {
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
          }
          
          // Display error alongside the forgot password link
          const metaRow = submitButton.form.querySelector('.meta-row');
          const errorEl = document.createElement('div');
          errorEl.className = 'form-error-message';
          errorEl.textContent = typeof error === 'string' ? error.replace(/^Authentication Error:\s*/i, '') : 'Sign in failed.';
          if (metaRow) {
            metaRow.prepend(errorEl);
          }
          
          if (submitButton) {
            submitButton.removeAttribute("disabled");
            submitButton.textContent = isSignup ? "Sign up" : "Sign in";
          }
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
