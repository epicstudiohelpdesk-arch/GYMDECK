import React, { useEffect, useId, useState } from "react";
import {
  AlertCircle,
  Boxes,
  CalendarDays,
  Hash,
  Package,
  Sliders,
  Truck,
} from "lucide-react";
import { formatUnits, getStockState } from "./InventoryShared.jsx";
import {
  Badge,
  Button,
  DropdownField,
  InlineAlert,
  Modal,
  SectionHeading,
  TextAreaField,
  TextField,
} from "./InventoryUI.jsx";
import { receiveStock, adjustStock } from "../inventoryApi.js";

const ADJUSTMENT_REASONS = [
  { value: "PHYSICAL_AUDIT", label: "Stock count surplus (+)" },
  { value: "PHYSICAL_AUDIT_SUB", label: "Stock count discrepancy (−)" },
  { value: "DAMAGE", label: "Damaged / broken (−)" },
  { value: "EXPIRY", label: "Expired write-off (−)" },
  { value: "LOSS", label: "Stolen / missing (−)" },
  { value: "INTERNAL_USE", label: "Internal gym / staff use (−)" },
];

const NEGATIVE_REASONS = new Set([
  "PHYSICAL_AUDIT_SUB",
  "DAMAGE",
  "EXPIRY",
  "LOSS",
  "INTERNAL_USE",
]);

export const StockOperationsModal = ({
  isOpen,
  onClose,
  mode = "receive",
  products = [],
  suppliers = [],
  selectedProduct = null,
  onSuccess,
}) => {
  const formId = useId();
  const isReceive = mode === "receive";

  const [targetProductId, setTargetProductId] = useState(
    selectedProduct?.id || products[0]?.id || ""
  );
  const [variantId, setVariantId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("PHYSICAL_AUDIT");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentProduct =
    products.find((product) => product.id === targetProductId) || selectedProduct;
  const currentVariant = currentProduct?.variants?.find((variant) => variant.id === variantId);

  useEffect(() => {
    if (currentProduct?.has_variants) {
      setVariantId(currentProduct.variants?.[0]?.id || "");
    } else {
      setVariantId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProductId]);

  if (!isOpen) return null;

  const productOptions = products.map((product) => ({
    value: product.id,
    label: product.name,
    description: `${product.brand ? `${product.brand} · ` : ""}${formatUnits(
      product.available_quantity,
      product.unit_of_measure
    )} available`,
  }));

  const variantOptions = (currentProduct?.variants || []).map((variant) => ({
    value: variant.id,
    label: variant.variant_name,
    description: `${variant.available_quantity || 0} in stock`,
  }));

  const supplierOptions = [
    { value: "", label: "Direct / self-purchased" },
    ...suppliers.map((supplier) => ({
      value: supplier.id,
      label: supplier.supplier_name,
      description: supplier.contact_person || supplier.phone || undefined,
    })),
  ];

  const quantityNumber = parseInt(quantity, 10) || 0;
  const signedDelta = isReceive
    ? quantityNumber
    : NEGATIVE_REASONS.has(adjustmentReason)
    ? -Math.abs(quantityNumber)
    : Math.abs(quantityNumber);

  const currentStock = currentVariant
    ? Number(currentVariant.available_quantity) || 0
    : Number(currentProduct?.available_quantity) || 0;
  const projectedStock = currentStock + signedDelta;

  const stockState = currentProduct ? getStockState(currentProduct) : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!targetProductId) {
      setError("Choose a product to continue.");
      return;
    }
    if (!quantityNumber || quantityNumber === 0) {
      setError("Enter a non-zero quantity.");
      return;
    }
    if (isReceive && quantityNumber < 0) {
      setError("Received quantity must be positive.");
      return;
    }
    if (!isReceive && signedDelta < 0 && !notes.trim()) {
      setError("A note is required for any stock reduction.");
      return;
    }

    setSaving(true);
    try {
      if (isReceive) {
        await receiveStock({
          productId: targetProductId,
          variantId: variantId || null,
          supplierId: supplierId || null,
          quantity: quantityNumber,
          unitCostMinorUnits: unitCost ? Math.round(parseFloat(unitCost) * 100) : null,
          referenceNumber: referenceNumber.trim() || null,
          batchNumber: batchNumber.trim() || null,
          expiresAt: expiresAt || null,
          notes: notes.trim() || null,
        });
      } else {
        await adjustStock({
          productId: targetProductId,
          variantId: variantId || null,
          movementType: NEGATIVE_REASONS.has(adjustmentReason)
            ? adjustmentReason === "PHYSICAL_AUDIT_SUB"
              ? "ADJUSTMENT_SUB"
              : adjustmentReason
            : "ADJUSTMENT_ADD",
          quantityChange: signedDelta,
          reason: notes.trim() || adjustmentReason,
        });
      }

      onSuccess?.();
      onClose();
    } catch (submitError) {
      console.error("Stock operation failed:", submitError);
      setError(submitError?.message || "The stock update could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={isReceive ? Truck : Sliders}
      title={isReceive ? "Receive stock" : "Adjust stock"}
      description={
        isReceive
          ? "Record incoming units, purchase invoice and supplier batches."
          : "Correct counts, write off damaged items or record stock losses."
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} disabled={saving}>
            {saving ? "Saving…" : isReceive ? "Confirm receipt" : "Apply adjustment"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {error ? <InlineAlert title="Stock update failed">{error}</InlineAlert> : null}

        <DropdownField
          label="Product"
          required
          value={targetProductId}
          onChange={(nextValue) => {
            setTargetProductId(nextValue);
            setVariantId("");
          }}
          options={productOptions}
          placeholder="Choose a product"
          disabled={Boolean(selectedProduct?.id)}
          size="lg"
          hint={
            selectedProduct?.id
              ? "Product is fixed because this was opened from a product."
              : undefined
          }
        />

        {currentProduct?.has_variants && variantOptions.length > 0 ? (
          <DropdownField
            label="Variant"
            required
            value={variantId}
            onChange={setVariantId}
            options={variantOptions}
            placeholder="Choose a variant"
            size="lg"
          />
        ) : null}

        {currentProduct ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Package size={14} className="text-slate-400" aria-hidden="true" />
              <span className="text-[11.5px] font-semibold text-slate-700">
                {currentProduct.name}
                {currentVariant ? ` · ${currentVariant.variant_name}` : ""}
              </span>
              {stockState ? <Badge tone={stockState.tone} dot>{stockState.label}</Badge> : null}
            </div>
            <div className="flex items-center gap-2 text-[11px] tabular-nums">
              <span className="text-slate-500">Current {currentStock}</span>
              {quantityNumber ? (
                <>
                  <span className="text-slate-300">→</span>
                  <span
                    className={`font-bold ${
                      projectedStock < 0
                        ? "text-rose-600"
                        : signedDelta > 0
                        ? "text-emerald-600"
                        : "text-slate-800"
                    }`}
                  >
                    {projectedStock}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {isReceive ? (
          <>
            <div>
              <SectionHeading icon={Boxes} title="Receipt details" className="mb-2.5" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Units received"
                  required
                  type="number"
                  min="1"
                  inputMode="numeric"
                  placeholder="e.g. 24"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
                <TextField
                  label="Unit cost (₹)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                />
                <DropdownField
                  label="Supplier"
                  value={supplierId}
                  onChange={setSupplierId}
                  options={supplierOptions}
                  placeholder="Direct / self-purchased"
                  size="lg"
                  menuMinWidth={260}
                />
                <TextField
                  label="Invoice / bill ref"
                  placeholder="e.g. INV-2026-904"
                  value={referenceNumber}
                  onChange={(event) => setReferenceNumber(event.target.value)}
                />
              </div>
            </div>

            <div>
              <SectionHeading
                icon={CalendarDays}
                title="Batch & expiry"
                description="Optional — populate this for supplements and perishables."
                className="mb-2.5"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="Batch number"
                  placeholder="e.g. B-9941"
                  value={batchNumber}
                  onChange={(event) => setBatchNumber(event.target.value)}
                />
                <TextField
                  label="Expiry date"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <SectionHeading icon={Sliders} title="Adjustment" className="mb-2.5" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                <DropdownField
                  label="Reason"
                  value={adjustmentReason}
                  onChange={setAdjustmentReason}
                  options={ADJUSTMENT_REASONS}
                  size="lg"
                  menuMinWidth={240}
                />
                <TextField
                  label="Quantity"
                  required
                  type="number"
                  min="1"
                  inputMode="numeric"
                  placeholder="e.g. 2"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </div>
              <p className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-slate-400">
                <Hash size={10} aria-hidden="true" />
                {signedDelta >= 0
                  ? `This will add ${signedDelta} unit${signedDelta === 1 ? "" : "s"}.`
                  : `This will remove ${Math.abs(signedDelta)} unit${Math.abs(signedDelta) === 1 ? "" : "s"}.`}
              </p>
            </div>
          </>
        )}

        <TextAreaField
          label="Notes / audit justification"
          rows={2}
          required={!isReceive && signedDelta < 0}
          placeholder={
            isReceive
              ? "Optional delivery context or remarks"
              : "Explain the correction, damage or write-off"
          }
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          hint={
            !isReceive && signedDelta < 0
              ? "Required for any reduction so the ledger stays auditable."
              : undefined
          }
        />

        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-[10.5px] leading-4 text-slate-500">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          Every movement is written to the append-only stock ledger with the actor and reason attached.
        </div>
      </form>
    </Modal>
  );
};
