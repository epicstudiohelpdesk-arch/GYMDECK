import React, { useState } from "react";
import {
  X,
  Package,
  Boxes,
  IndianRupee,
  Layers,
  Calendar,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { ProductImageUploader } from "./ProductImageUploader.jsx";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  setPrimaryProductImage,
} from "../inventoryApi.js";

export const ProductEditorDrawer = ({
  isOpen,
  onClose,
  product = null,
  categories = [],
  suppliers = [],
  onSaved,
}) => {
  const isEdit = Boolean(product?.id);

  // Form State
  const [name, setName] = useState(product?.name || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [categoryId, setCategoryId] = useState(product?.category_id || (categories[0]?.id || ""));
  const [sku, setSku] = useState(product?.sku || "");
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [shortDescription, setShortDescription] = useState(product?.short_description || "");
  const [description, setDescription] = useState(product?.description || "");
  const [unitOfMeasure, setUnitOfMeasure] = useState(product?.unit_of_measure || "pcs");
  const [status, setStatus] = useState(product?.status || "ACTIVE");
  const [storeVisibility, setStoreVisibility] = useState(product?.store_visibility || "VISIBLE");

  // Pricing (Minor units in paise)
  const [costPrice, setCostPrice] = useState(
    product?.cost_price_minor_units != null ? String(product.cost_price_minor_units / 100) : ""
  );
  const [sellingPrice, setSellingPrice] = useState(
    product?.selling_price_minor_units != null ? String(product.selling_price_minor_units / 100) : ""
  );
  const [mrp, setMrp] = useState(
    product?.mrp_minor_units != null ? String(product.mrp_minor_units / 100) : ""
  );
  const [taxConfiguration, setTaxConfiguration] = useState(product?.tax_configuration || "EXEMPT");
  const [taxRate, setTaxRate] = useState(product?.tax_rate ? String(product.tax_rate) : "0");

  // Stock
  const [initialStock, setInitialStock] = useState(
    product?.available_quantity != null ? String(product.available_quantity) : "0"
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product?.low_stock_threshold != null ? String(product.low_stock_threshold) : "5"
  );
  const [batchTracking, setBatchTracking] = useState(Boolean(product?.batch_tracking_enabled));
  const [expiryTracking, setExpiryTracking] = useState(Boolean(product?.expiry_tracking_enabled));

  // Variants
  const [hasVariants, setHasVariants] = useState(Boolean(product?.has_variants));
  const [variants, setVariants] = useState(product?.variants || []);

  // Images state (existing + newly uploaded staging)
  const [existingImages, setExistingImages] = useState(product?.images || []);
  const [stagedUploads, setStagedUploads] = useState([]); // { file, filename, base64Data, previewUrl }
  const [primaryImageId, setPrimaryImageId] = useState(product?.primary_image?.id || null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Calculated gross margin
  const costNum = parseFloat(costPrice) || 0;
  const sellNum = parseFloat(sellingPrice) || 0;
  const marginPercent = sellNum > 0 ? (((sellNum - costNum) / sellNum) * 100).toFixed(1) : 0;

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        variantName: "",
        sku: "",
        costPriceMinorUnits: costNum ? Math.round(costNum * 100) : null,
        sellingPriceMinorUnits: sellNum ? Math.round(sellNum * 100) : 0,
        mrpMinorUnits: mrp ? Math.round(parseFloat(mrp) * 100) : null,
        initialStock: 0,
        lowStockThreshold: 5,
        isActive: true,
      },
    ]);
  };

  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const handleUpdateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleStageImage = (imgData) => {
    setStagedUploads([...stagedUploads, imgData]);
  };

  const handleDeleteStagedImage = (target) => {
    if (target.id) {
      // Existing server image
      deleteProductImage(target.id)
        .then(() => {
          setExistingImages(existingImages.filter((i) => i.id !== target.id));
        })
        .catch((e) => setError(e.message));
    } else {
      setStagedUploads(stagedUploads.filter((i) => i.previewUrl !== target.previewUrl));
    }
  };

  const handleSetPrimary = (target) => {
    if (target.id && isEdit) {
      setPrimaryProductImage({ imageId: target.id, productId: product.id })
        .then(() => setPrimaryImageId(target.id))
        .catch((e) => setError(e.message));
    } else {
      setPrimaryImageId(target.id || target.previewUrl);
    }
  };

  const handleSave = async (andAddAnother = false) => {
    setError("");
    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!sellingPrice || isNaN(sellNum) || sellNum < 0) {
      setError("Please provide a valid selling price.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim() || null,
        categoryId: categoryId || null,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        shortDescription: shortDescription.trim() || null,
        description: description.trim() || null,
        productType: "PHYSICAL",
        unitOfMeasure,
        costPriceMinorUnits: costNum ? Math.round(costNum * 100) : null,
        sellingPriceMinorUnits: Math.round(sellNum * 100),
        mrpMinorUnits: mrp && !isNaN(parseFloat(mrp)) ? Math.round(parseFloat(mrp) * 100) : null,
        taxConfiguration,
        taxRate: parseFloat(taxRate) || 0.0,
        hasVariants,
        batchTrackingEnabled: batchTracking,
        expiryTrackingEnabled: expiryTracking,
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
        status,
        storeVisibility,
        initialStock: parseInt(initialStock, 10) || 0,
        variants: hasVariants
          ? variants.map((v) => ({
              id: v.id,
              variantName: v.variantName,
              sku: v.sku || null,
              costPriceMinorUnits: v.costPriceMinorUnits,
              sellingPriceMinorUnits: v.sellingPriceMinorUnits || Math.round(sellNum * 100),
              mrpMinorUnits: v.mrpMinorUnits,
              lowStockThreshold: v.lowStockThreshold || 5,
              initialStock: parseInt(v.initialStock, 10) || 0,
              isActive: v.isActive ?? true,
            }))
          : [],
      };

      let savedProduct;
      if (isEdit) {
        savedProduct = await updateProduct(product.id, payload);
      } else {
        savedProduct = await createProduct(payload);
      }

      // Upload staged images to the new or existing product
      if (stagedUploads.length > 0 && savedProduct?.id) {
        for (let i = 0; i < stagedUploads.length; i++) {
          const up = stagedUploads[i];
          const isPrimary = i === 0 && existingImages.length === 0;
          await uploadProductImage({
            productId: savedProduct.id,
            filename: up.filename,
            base64Data: up.base64Data,
            isPrimary,
          });
        }
      }

      onSaved?.(savedProduct);

      if (andAddAnother) {
        setName("");
        setSku("");
        setBarcode("");
        setSellingPrice("");
        setCostPrice("");
        setMrp("");
        setInitialStock("0");
        setStagedUploads([]);
        setVariants([]);
      } else {
        onClose();
      }
    } catch (err) {
      console.error("Save product error:", err);
      setError(err?.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Package className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEdit ? "Edit Product" : "Add New Gym Product"}
              </h3>
              <p className="text-xs text-slate-400">
                Configure retail details, pricing, variants, and stock balances.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* SECTION A: IMAGES */}
          <section className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
            <ProductImageUploader
              images={[...existingImages, ...stagedUploads]}
              primaryImageId={primaryImageId}
              onImagesChange={handleStageImage}
              onDeleteImage={handleDeleteStagedImage}
              onSetPrimary={handleSetPrimary}
            />
          </section>

          {/* SECTION B: BASIC INFORMATION */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Boxes className="h-3.5 w-3.5 text-orange-500" /> Basic Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Product Name <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. NitroTech Whey Gold 2kg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Brand</label>
                <input
                  type="text"
                  placeholder="e.g. MuscleTech"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">SKU Code</label>
                <input
                  type="text"
                  placeholder="e.g. WHEY-GOLD-2K"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Barcode / UPC</label>
                <input
                  type="text"
                  placeholder="e.g. 890123456789"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Short Summary</label>
                <input
                  type="text"
                  placeholder="Single line overview for catalog cards"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>
          </section>

          {/* SECTION C: PRICING */}
          <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/30 p-4.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <IndianRupee className="h-3.5 w-3.5 text-emerald-600" /> Pricing & Margins
              </h4>
              {marginPercent > 0 ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                  <Sparkles className="h-3 w-3" /> {marginPercent}% Margin
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Selling Price (₹) <span className="text-orange-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Purchase Cost (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">MRP (₹)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>
          </section>

          {/* SECTION D: INVENTORY & STOCK */}
          {!hasVariants ? (
            <section className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-orange-500" /> Stock Configuration
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {isEdit ? "Stock Balance" : "Opening Stock"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={isEdit}
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 outline-none"
                  />
                  {isEdit ? (
                    <span className="text-[10px] text-slate-400">Use Stock Adjustment to change balances</span>
                  ) : null}
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Low Stock Alert At
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Unit of Measure</label>
                  <input
                    type="text"
                    value={unitOfMeasure}
                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* SECTION E: TRACKING OPTIONS */}
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-700">This product has variants (Flavors, Sizes, Colors)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={expiryTracking}
                onChange={(e) => setExpiryTracking(e.target.checked)}
                className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-700">Track Expiry Dates (Supplements & Edibles)</span>
            </label>
          </div>

          {/* SECTION F: VARIANTS LIST IF ENABLED */}
          {hasVariants ? (
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Product Variants</h4>
                  <p className="text-[11px] text-slate-400">Stock will be tracked individually per variant.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-orange-500 hover:text-orange-600 shadow-2xs transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Variant
                </button>
              </div>

              {variants.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-2.5">
                  <input
                    type="text"
                    placeholder="Variant Name (e.g. Chocolate 1kg)"
                    value={v.variantName}
                    onChange={(e) => handleUpdateVariant(idx, "variantName", e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-800"
                  />
                  <input
                    type="number"
                    placeholder="Sell Price ₹"
                    value={v.sellingPriceMinorUnits ? v.sellingPriceMinorUnits / 100 : ""}
                    onChange={(e) =>
                      handleUpdateVariant(
                        idx,
                        "sellingPriceMinorUnits",
                        Math.round((parseFloat(e.target.value) || 0) * 100)
                      )
                    }
                    className="w-24 h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-800"
                  />
                  {!isEdit ? (
                    <input
                      type="number"
                      placeholder="Stock"
                      value={v.initialStock || ""}
                      onChange={(e) => handleUpdateVariant(idx, "initialStock", e.target.value)}
                      className="w-16 h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-800"
                    />
                  ) : (
                    <span className="w-16 text-center text-xs font-bold text-slate-600">
                      {v.available_quantity || 0}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </section>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!isEdit ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50"
              >
                Save & Add Another
              </button>
            ) : null}

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-6 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/25 transition-all hover:shadow-orange-500/35 active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Update Product" : "Save Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
