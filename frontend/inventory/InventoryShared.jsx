/**
 * Shared Inventory formatting helpers used across the catalogue, ledger,
 * drawers and modals. Presentation primitives live in InventoryUI.jsx.
 */

export const formatINR = (minorUnits) => {
  const value = (Number(minorUnits) || 0) / 100;
  const hasPaise = Math.abs(value % 1) > 0.0001;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(value);
};

export const formatUnits = (qty, uom = "pcs") => {
  const amount = Number(qty) || 0;
  return `${amount} ${String(uom || "pcs").trim() || "pcs"}`;
};

export const formatCount = (value) => new Intl.NumberFormat("en-IN").format(Number(value) || 0);

/** Stock health for a product, mapped onto the Badge tones. */
export const getStockState = (product) => {
  const qty = Number(product?.available_quantity) || 0;
  const threshold = Number(product?.low_stock_threshold) || 5;

  if (qty <= 0) {
    return { key: "out", label: "Out of stock", tone: "rose", text: "text-rose-600" };
  }
  if (qty <= threshold) {
    return { key: "low", label: "Low stock", tone: "amber", text: "text-amber-600" };
  }
  return { key: "in", label: "In stock", tone: "emerald", text: "text-emerald-600" };
};

const MOVEMENT_LABELS = {
  OPENING: "Opening stock",
  PURCHASE: "Purchase",
  ADJUSTMENT_ADD: "Manual addition",
  ADJUSTMENT_SUB: "Manual deduction",
  SALE: "Sale",
  RETURN: "Return",
  DAMAGE: "Damaged",
  EXPIRY: "Expired",
  LOSS: "Lost",
  INTERNAL_USE: "Internal use",
};

export const formatMovementType = (type) =>
  MOVEMENT_LABELS[type] || String(type || "").replaceAll("_", " ").toLowerCase();

export const getBatchState = (batch) => {
  if (!batch?.expires_at) return { key: "none", label: "No expiry", tone: "slate" };
  const expiry = new Date(batch.expires_at);
  if (Number.isNaN(expiry.getTime())) return { key: "none", label: "No expiry", tone: "slate" };
  const now = new Date();
  if (expiry < now) return { key: "expired", label: "Expired", tone: "rose" };
  if (expiry - now < 30 * 24 * 60 * 60 * 1000) return { key: "soon", label: "Expiring soon", tone: "amber" };
  return { key: "valid", label: "Valid batch", tone: "emerald" };
};
