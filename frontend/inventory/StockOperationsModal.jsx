import React, { useState } from "react";
import {
  Package,
  Truck,
  Sliders,
  History,
  AlertTriangle,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { formatINR, formatUnits } from "./InventoryShared.jsx";
import { receiveStock, adjustStock } from "../inventoryApi.js";

export const StockOperationsModal = ({
  isOpen,
  onClose,
  mode = "receive", // "receive" | "adjust"
  products = [],
  suppliers = [],
  selectedProduct = null,
  onSuccess,
}) => {
  const [targetProductId, setTargetProductId] = useState(selectedProduct?.id || (products[0]?.id || ""));
  const [variantId, setVariantId] = useState("");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("PHYSICAL_AUDIT");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === targetProductId) || selectedProduct;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!targetProductId) {
      setError("Please select a target product.");
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum === 0) {
      setError("Quantity must be a non-zero number.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "receive") {
        if (qtyNum <= 0) {
          setError("Received stock quantity must be positive.");
          setSaving(false);
          return;
        }

        const costMinor = unitCost ? Math.round(parseFloat(unitCost) * 100) : null;
        await receiveStock({
          productId: targetProductId,
          variantId: variantId || null,
          supplierId: supplierId || null,
          quantity: qtyNum,
          unitCostMinorUnits: costMinor,
          referenceNumber: invoiceNumber.trim() || null,
          batchNumber: batchNumber.trim() || null,
          expiresAt: expiresAt || null,
          notes: notes.trim() || null,
        });
      } else {
        // Adjust
        let delta = qtyNum;
        let movementType = "ADJUSTMENT_ADD";

        if (adjustmentReason === "PHYSICAL_AUDIT_SUB" || adjustmentReason === "DAMAGE" || adjustmentReason === "EXPIRY" || adjustmentReason === "LOSS") {
          delta = -Math.abs(qtyNum);
          movementType = adjustmentReason === "PHYSICAL_AUDIT_SUB" ? "ADJUSTMENT_SUB" : adjustmentReason;
        }

        if (delta < 0 && !notes.trim()) {
          setError("A note or explanation is required for stock reductions.");
          setSaving(false);
          return;
        }

        await adjustStock({
          productId: targetProductId,
          variantId: variantId || null,
          movementType,
          quantityChange: delta,
          reason: notes.trim() || adjustmentReason,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Stock operation failed:", err);
      setError(err?.message || "Stock update failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                mode === "receive" ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
              }`}
            >
              {mode === "receive" ? (
                <Truck className="h-5 w-5 stroke-[2]" />
              ) : (
                <Sliders className="h-5 w-5 stroke-[2]" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {mode === "receive" ? "Receive Stock Purchase" : "Adjust Inventory Balance"}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === "receive"
                  ? "Record incoming units, purchase invoice and supplier batches."
                  : "Correct counts, write off damaged items or record stock losses."}
              </p>
            </div>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Product selector if not pre-locked */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Product</label>
            <select
              disabled={Boolean(selectedProduct?.id)}
              value={targetProductId}
              onChange={(e) => {
                setTargetProductId(e.target.value);
                setVariantId("");
              }}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 disabled:bg-slate-100"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.brand ? `(${p.brand})` : ""} - In Stock: {p.available_quantity || 0}
                </option>
              ))}
            </select>
          </div>

          {/* Variant selector if product has variants */}
          {currentProduct?.has_variants && currentProduct?.variants?.length > 0 ? (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Variant</label>
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
              >
                <option value="">All Variants (General)</option>
                {currentProduct.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.variant_name} (Current: {v.available_quantity || 0})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Receive Specific Fields */}
          {mode === "receive" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Units Received <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 24"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                  >
                    <option value="">Direct / Self-purchased</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Invoice / Bill Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-904"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Batch & Expiry optional info */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B-9941"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Adjust Specific Fields */
            <>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Adjustment Reason
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                >
                  <option value="PHYSICAL_AUDIT">Stock Count Surplus (+)</option>
                  <option value="PHYSICAL_AUDIT_SUB">Stock Count Discrepancy (-)</option>
                  <option value="DAMAGE">Damaged / Broken Product (-)</option>
                  <option value="EXPIRY">Expired Product Write-off (-)</option>
                  <option value="LOSS">Stolen / Lost Item (-)</option>
                  <option value="INTERNAL_USE">Internal Gym / Staff Consumption (-)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Quantity To Adjust <span className="text-orange-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 2"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Notes / Audit Justification
            </label>
            <textarea
              rows="2"
              placeholder="Provide reason or context for this inventory event"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-orange-500 hover:bg-orange-600 px-6 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/25 transition-all hover:shadow-orange-500/35 active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving..." : mode === "receive" ? "Confirm Stock Receipt" : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
