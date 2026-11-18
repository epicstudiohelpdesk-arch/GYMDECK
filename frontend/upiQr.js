/**
 * MERCHANT UPI QR — single source of truth
 *
 * The UPI ID an owner saves under Settings → Banking & Settlement produces one
 * merchant QR. Gym Profile (Banking & Settlement), Collect Fees and any other
 * surface must render that same symbol, so the intent URI and the vector
 * encoding live here instead of being re-implemented per page.
 */
import { qrcode } from "./qr-lib.js";

/** Error correction used for merchant QR symbols (NPCI apps tolerate print wear). */
export const UPI_QR_ECC = "M";

/** Module size / quiet-zone padding used for every merchant QR render. */
export const UPI_QR_CELL_SIZE = 6;
export const UPI_QR_MARGIN = 2;

/**
 * NPCI UPI intent URI for a merchant VPA: `upi://pay?pa=...&pn=...&cu=INR`.
 * No amount is baked in — the member enters the amount in their UPI app, so the
 * same printed QR stays valid for every transaction.
 */
export const buildMerchantUpiUri = ({ vpa, name } = {}) => {
  const merchantVpa = typeof vpa === "string" ? vpa.trim() : "";
  if (!merchantVpa) return "";
  const payeeName = encodeURIComponent((name || "Merchant").trim());
  return `upi://pay?pa=${merchantVpa}&pn=${payeeName}&cu=INR`;
};

/**
 * Renders a UPI intent URI as a pure-vector SVG string. Returns null when there
 * is nothing to encode or the encoder rejects the payload.
 */
export const buildMerchantUpiQrSvg = (uri, { cellSize, margin, ecc } = {}) => {
  if (!uri) return null;
  try {
    const qr = qrcode(0, ecc || UPI_QR_ECC);
    qr.addData(uri);
    qr.make();
    const svg = qr.createSvgTag({
      cellSize: cellSize || UPI_QR_CELL_SIZE,
      margin: margin ?? UPI_QR_MARGIN,
      scalable: true
    });
    // `scalable` omits width/height, which leaves an inline SVG at the browser's
    // 300x150 default and clips the symbol inside fixed-size cards. Size it to its
    // container and centre it instead.
    return svg
      .replace('<svg version="1.1"', '<svg version="1.1" width="100%" height="100%" shape-rendering="crispEdges"')
      .replace('preserveAspectRatio="xMinYMin meet"', 'preserveAspectRatio="xMidYMid meet"');
  } catch (err) {
    console.error("Failed to generate vector UPI QR code:", err);
    return null;
  }
};

/** True when an account record actually carries a usable merchant VPA. */
export const hasMerchantUpiId = (account) => {
  const vpa = account?.upiVpa ?? account?.upiId;
  return Boolean(typeof vpa === "string" && vpa.trim());
};
