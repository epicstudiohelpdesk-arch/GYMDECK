/**
 * Assisted WhatsApp broadcast queue for the Notification Center.
 *
 * The encrypted vault (Rust side) resolves the audience, renders each member's message
 * and stores a `wa.me` click-to-chat link per recipient. This module only talks to those
 * commands and opens the links in the owner's own WhatsApp — no paid provider API is
 * involved, so nothing here sends bulk traffic on the gym's number.
 *
 * The queue lives on the desktop only; the browser preview has no vault to write to.
 */

const isTauri = () => typeof window !== "undefined" && Boolean(window.__TAURI__?.core?.invoke);

async function call(command, args = {}) {
  const response = await window.__TAURI__.core.invoke(command, args);
  if (response && response.success === false) {
    throw new Error(response?.error?.message || "Broadcast request failed.");
  }
  return response?.data;
}

/**
 * Creates a run for the given members (or segment) and returns the per-member queue.
 */
export async function previewBroadcast(payload) {
  return call("preview_broadcast_command", { payload });
}

/**
 * Loads one run with its recipients, used to resume an unfinished queue.
 */
export async function getBroadcast(broadcastId) {
  return call("get_broadcast_command", { broadcastId });
}

/**
 * Recent runs for the signed-in gym, newest first.
 */
export async function listBroadcasts(limit = 100) {
  const data = await call("list_broadcasts_command", { limit });
  return data?.broadcasts || [];
}

/**
 * Stores what the owner reported for one member: SENT, FAILED or SKIPPED.
 */
export async function recordBroadcastResult({ broadcastId, recipientId, status }) {
  return call("record_broadcast_result_command", {
    payload: { broadcastId, recipientId, status },
  });
}

/**
 * Stops a run, marking everything still queued as skipped.
 */
export async function cancelBroadcast(broadcastId) {
  return call("cancel_broadcast_command", { broadcastId });
}

/**
 * Removes a run from this device's history.
 */
export async function deleteBroadcast(broadcastId) {
  return call("delete_broadcast_command", { broadcastId });
}

/**
 * Opens a click-to-chat link in the owner's WhatsApp (desktop app when installed,
 * otherwise the web client).
 */
export function openWhatsAppLink(url) {
  if (!url) return;
  const opener = window.__TAURI__?.opener;
  if (opener?.openUrl) {
    opener.openUrl(url).catch(() => {
      window.open(url, "_blank", "noopener,noreferrer");
    });
    return;
  }
  const shell = window.__TAURI__?.shell;
  if (shell?.open) {
    shell.open(url).catch(() => {
      window.open(url, "_blank", "noopener,noreferrer");
    });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export { isTauri };
