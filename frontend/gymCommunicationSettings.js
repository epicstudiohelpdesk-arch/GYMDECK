/**
 * Per-gym local persistence for Settings → Gym Profile → Contact & Communication.
 *
 * The desktop build writes through the encrypted SQLCipher vault. The native
 * session supplies the gym id, so each row is locked to the gym account that is
 * signed in — the renderer never chooses the tenant. The browser preview keeps a
 * mirror in localStorage purely so the form stays usable without the native layer.
 */

const BROWSER_STORE_PREFIX = "gymdeck_communication_settings";

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

const writeBrowserMirror = (settings) => {
  try {
    localStorage.setItem(browserStoreKey(), JSON.stringify(settings));
  } catch (err) {
    console.warn("GymDeck: could not mirror communication settings locally", err);
  }
};

async function invoke(command, args = {}) {
  const response = await window.__TAURI__.core.invoke(command, args);
  if (response && response.success === false) {
    throw new Error(response?.error?.message || "Communication settings database request failed.");
  }
  return response;
}

/**
 * The locked settings row for the signed-in gym, or null when nothing is stored yet.
 */
export async function loadGymCommunicationSettings() {
  if (isTauri()) {
    const response = await invoke("get_gym_communication_settings_command");
    return response?.data?.settings || null;
  }
  return readBrowserMirror();
}

/**
 * Create or replace the signed-in gym's settings row and return the stored record.
 */
export async function saveGymCommunicationSettings(settings) {
  if (isTauri()) {
    const response = await invoke("save_gym_communication_settings_command", { payload: settings });
    const saved = response?.data?.settings || null;
    if (saved) writeBrowserMirror(saved);
    return saved;
  }
  const record = { ...settings, updatedAt: new Date().toISOString() };
  writeBrowserMirror(record);
  return record;
}

export const gymCommunicationSettingsApi = {
  isTauri,
  load: loadGymCommunicationSettings,
  save: saveGymCommunicationSettings,
};

export default gymCommunicationSettingsApi;
