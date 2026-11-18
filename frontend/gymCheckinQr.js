/**
 * GymDeck — Gym Check-in Pass (shared QR core)
 *
 * One permanent pass per gym. It is minted inside the gym signup transaction,
 * stored in the encrypted vault (`gym_checkin_qr`), replicated to the cloud, and
 * displayed wherever an owner needs it (Daily Check-in + Gym Profile → QR Passes).
 *
 * The member app scans the pass payload, resolves it to a gym, and lets the
 * member check in — so the artwork here must be a genuine ISO/IEC 18004 symbol,
 * not a decorative placeholder.
 */

import { qrcode } from "./qr-lib.js";

// Quiet zone kept around the artwork (modules) so scanners can lock on cleanly.
export const QR_QUIET_ZONE = 3;

/** Encodes the stored pass payload into a real QR module matrix (ECC level Q). */
export function getQRMatrix(payload) {
  if (!payload) return null;

  try {
    const qr = qrcode(0, "Q");
    qr.addData(payload);
    qr.make();

    const count = qr.getModuleCount();
    return Array.from({ length: count }, (_, r) =>
      Array.from({ length: count }, (_, c) => qr.isDark(r, c))
    );
  } catch (err) {
    console.error("GymDeck: failed to encode attendance QR payload", err);
    return null;
  }
}

export const isFinderModule = (r, c, n) =>
  (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

/**
 * Rounded data modules with soft-cornered finder eyes, authored in module units
 * (1 unit = 1 module) so the exact same artwork scales for the on-screen pass,
 * the downloadable standee and the printed sheet.
 */
export const buildQrArtwork = (matrix) => {
  const n = matrix.length;
  let dots = "";

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!matrix[r][c] || isFinderModule(r, c, n)) continue;
      dots += `<rect x="${c}" y="${r}" width="1" height="1" rx="0.22"/>`;
    }
  }

  const eyeAt = (x, y) =>
    `<rect x="${x}" y="${y}" width="7" height="7" rx="2"/>` +
    `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1.35" fill="#ffffff"/>` +
    `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9"/>`;

  return { dots, eyes: eyeAt(0, 0) + eyeAt(n - 7, 0) + eyeAt(0, n - 7) };
};

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Printable / downloadable standee (800x1060 vector) for the front desk.
 * Uses the same module matrix as the on-screen pass, so every copy scans the same.
 */
export function buildCheckInStandeeSvg(matrix, { gymName, gymCode } = {}) {
  if (!matrix || !matrix.length) return null;

  const name = escapeXml(gymName || "GymDeck Facility");
  const code = escapeXml(gymCode || "—");
  const art = buildQrArtwork(matrix);
  const total = matrix.length + QR_QUIET_ZONE * 2;
  const cell = 408 / total;
  const qrX = 164 + 32 + QR_QUIET_ZONE * cell;
  const qrY = 244 + 32 + QR_QUIET_ZONE * cell;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1060" viewBox="0 0 800 1060">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="22%" r="80%">
      <stop offset="0%" stop-color="#1d3055" />
      <stop offset="46%" stop-color="#0f1e38" />
      <stop offset="100%" stop-color="#050a14" />
    </radialGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818cf8" />
      <stop offset="52%" stop-color="#22d3ee" />
      <stop offset="100%" stop-color="#34d399" />
    </linearGradient>
  </defs>
  <rect width="800" height="1060" rx="36" fill="url(#bgGrad)" />
  <rect x="26" y="26" width="748" height="1008" rx="28" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2" />

  <rect x="268" y="64" width="264" height="38" rx="19" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.32)" stroke-width="1.5" />
  <circle cx="296" cy="83" r="5" fill="#34d399" />
  <text x="316" y="88" fill="#7dd3fc" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="12" font-weight="800" letter-spacing="2">TOUCHLESS ATTENDANCE</text>

  <text x="400" y="156" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="34" font-weight="900" letter-spacing="-0.5">${name}</text>
  <text x="400" y="190" text-anchor="middle" fill="#94a3b8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="14" font-weight="700" letter-spacing="1.5">GYMDECK MEMBER APP CHECK-IN PASS</text>

  <rect x="158" y="238" width="484" height="484" rx="40" fill="url(#ringGrad)" />
  <rect x="164" y="244" width="472" height="472" rx="35" fill="#ffffff" />

  <g transform="translate(${qrX} ${qrY}) scale(${cell})" fill="#0a1020">
    ${art.eyes}
    ${art.dots}
  </g>

  <rect x="286" y="760" width="228" height="44" rx="22" fill="#0a1424" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" />
  <text x="400" y="788" text-anchor="middle" fill="#7dd3fc" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="800" letter-spacing="3">${code}</text>

  <text x="400" y="852" text-anchor="middle" fill="#ffffff" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="21" font-weight="800">Scan with the GymDeck Member App</text>
  <text x="400" y="882" text-anchor="middle" fill="#94a3b8" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="13" font-weight="500">New members scan this pass to be recognised and join this gym</text>

  <line x1="90" y1="926" x2="710" y2="926" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />
  <text x="400" y="962" text-anchor="middle" fill="#64748b" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">GYMDECK MEMBER ACCESS INFRASTRUCTURE</text>
  <text x="400" y="988" text-anchor="middle" fill="#475569" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="600">PERMANENT PASS • BOUND TO THIS FACILITY • END-TO-END ENCRYPTED</text>
</svg>`;
}

/** Normalises the stored pass record into the shape the UI renders. */
export const toGymPassInfo = (record) =>
  record
    ? {
        id: record.gymId,
        name: record.gymName,
        code: record.checkinCode,
        qrPayload: record.qrPayload
      }
    : null;

/**
 * Reads (and, on first access, provisions) this gym's pass from the local vault.
 * The command runs inside the signup transaction for new gyms, so by the time an
 * owner logs in the pass already exists.
 */
export async function loadGymCheckinPass() {
  if (!window.__TAURI__?.core?.invoke) {
    throw new Error("The check-in pass requires the GymDeck desktop runtime.");
  }
  const record = await window.__TAURI__.core.invoke("get_gym_checkin_qr_command");
  if (!record?.qrPayload) {
    throw new Error("No check-in pass was returned for this gym.");
  }
  return record;
}
