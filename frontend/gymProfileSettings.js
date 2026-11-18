/**
 * Per-gym local persistence for Settings → Gym Profile → General, plus the uploaded
 * brand imagery (logo + cover photo).
 *
 * The desktop build writes through the encrypted SQLCipher vault; the native session
 * supplies the gym id, so each row is locked to the gym account that is signed in.
 * Images are stored as data URLs, which is why they survive logout/login instead of
 * disappearing with the page's blob URLs. The browser preview keeps a localStorage
 * mirror purely so the form stays usable without the native layer.
 */

const BROWSER_STORE_PREFIX = "gymdeck_gym_profile";

const isTauri = () => typeof window !== "undefined" && Boolean(window.__TAURI__?.core?.invoke);

const browserStoreKey = () => {
  const gymCode =
    (typeof localStorage !== "undefined" &&
      (localStorage.getItem("gymdeck_gym_code") || localStorage.getItem("gymdeck_gym_name"))) ||
    "default";
  return `${BROWSER_STORE_PREFIX}:${String(gymCode).trim().toLowerCase()}`;
};

const readBrowserMirror = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(browserStoreKey()) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeBrowserMirror = (profile) => {
  try {
    const merged = { ...(readBrowserMirror() || {}), ...profile };
    localStorage.setItem(browserStoreKey(), JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn("GymDeck: could not mirror gym profile locally", err);
    return profile;
  }
};

async function call(command, args = {}) {
  const response = await window.__TAURI__.core.invoke(command, args);
  if (response && response.success === false) {
    throw new Error(response?.error?.message || "Gym profile database request failed.");
  }
  return response;
}

/**
 * The locked profile row for the signed-in gym, or null when nothing is stored yet.
 */
export async function loadGymProfile() {
  if (isTauri()) {
    const response = await call("get_gym_profile_command");
    return response?.data?.profile || null;
  }
  return readBrowserMirror();
}

/**
 * Create or replace the signed-in gym's General tab details and return the stored record.
 */
export async function saveGymProfile(profile) {
  if (isTauri()) {
    const response = await call("save_gym_profile_command", { payload: profile });
    const saved = response?.data?.profile || null;
    if (saved) writeBrowserMirror(saved);
    return saved;
  }
  return writeBrowserMirror({ ...profile, updatedAt: new Date().toISOString() });
}

/**
 * Persist just the imagery. Pass `logoDataUrl` / `coverDataUrl` only for the image that
 * changed; `null` clears the stored image.
 */
export async function saveGymProfileMedia({ logoDataUrl, coverDataUrl }) {
  const payload = {};
  if (logoDataUrl !== undefined) payload.logoDataUrl = logoDataUrl;
  if (coverDataUrl !== undefined) payload.coverDataUrl = coverDataUrl;

  if (isTauri()) {
    const response = await call("save_gym_profile_media_command", { payload });
    return response?.data?.profile || null;
  }
  return writeBrowserMirror(payload);
}

export const gymProfileApi = {
  isTauri,
  load: loadGymProfile,
  save: saveGymProfile,
  saveMedia: saveGymProfileMedia,
};

export default gymProfileApi;
