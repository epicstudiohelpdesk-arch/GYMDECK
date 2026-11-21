import React, { useState } from "react";
import {
  Boxes,
  IndianRupee,
  Package,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ProductImageUploader } from "./ProductImageUploader.jsx";
import {
  Badge,
  Button,
  Drawer,
  DropdownField,
  IconButton,
  InlineAlert,
  SectionHeading,
  Switch,
  TextAreaField,
  TextField,
} from "./InventoryUI.jsx";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
  setPrimaryProductImage,
} from "../inventoryApi.js";

const normalizeVariants = (product) =>
  (product?.variants || []).map((variant) => ({
    id: variant.id,
    variantName: variant.variant_name ?? variant.variantName ?? "",
    sku: variant.sku ?? "",
    barcode: variant.barcode ?? "",
    costPriceMinorUnits:
      variant.cost_price_minor_units ?? variant.costPriceMinorUnits ?? null,
    sellingPriceMinorUnits:
      variant.selling_price_minor_units ?? variant.sellingPriceMinorUnits ?? 0,
    mrpMinorUnits: variant.mrp_minor_units ?? variant.mrpMinorUnits ?? null,
    lowStockThreshold:
      variant.low_stock_threshold ?? variant.lowStockThreshold ?? 5,
    initialStock: variant.available_quantity ?? variant.initialStock ?? 0,
    availableQuantity: variant.available_quantity ?? variant.availableQuantity ?? 0,
    isActive: variant.is_active ?? variant.isActive ?? true,
  }));

const EditorSection = ({ icon, title, description, aside, children }) => (
  <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
    <SectionHeading icon={icon} title={title} description={description} aside={aside} className="mb-3.5" />
    {children}
  </section>
);

export const ProductEditorDrawer = ({
  isOpen,
  onClose,
  product = null,
  categories = [],
  suppliers = [],
  onSaved,
}) => {
  const isEdit = Boolean(product?.id);

  const [name, setName] = useState(product?.name || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [categoryId, setCategoryId] = useState(product?.category_id || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [shortDescription, setShortDescription] = useState(product?.short_description || "");
  const [description, setDescription] = useState(product?.description || "");
  const [unitOfMeasure, setUnitOfMeasure] = useState(product?.unit_of_measure || "pcs");
  const [status, setStatus] = useState(product?.status || "ACTIVE");
  const [storeVisibility, setStoreVisibility] = useState(product?.store_visibility || "VISIBLE");

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

  const [initialStock, setInitialStock] = useState(
    product?.available_quantity != null ? String(product.available_quantity) : "0"
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product?.low_stock_threshold != null ? String(product.low_stock_threshold) : "5"
  );
  const [batchTracking, setBatchTracking] = useState(Boolean(product?.batch_tracking_enabled));
  const [expiryTracking, setExpiryTracking] = useState(Boolean(product?.expiry_tracking_enabled));

  const [hasVariants, setHasVariants] = useState(Boolean(product?.has_variants));
  const [variants, setVariants] = useState(() => normalizeVariants(product));

  const [existingImages, setExistingImages] = useState(product?.images || []);
  const [stagedUploads, setStagedUploads] = useState([]);
  const [primaryImageId, setPrimaryImageId] = useState(product?.primary_image?.id || null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const costNum = parseFloat(costPrice) || 0;
  const sellNum = parseFloat(sellingPrice) || 0;
  const marginPercent = sellNum > 0 ? (((sellNum - costNum) / sellNum) * 100).toFixed(1) : null;

  const categoryOptions = [
    { value: "", label: "No category" },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

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
    setVariants(variants.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleUpdateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleStageImage = (imageData) => {
    setStagedUploads((current) => [...current, imageData]);
  };

  const handleDeleteStagedImage = (target) => {
    if (primaryImageId && (primaryImageId === target.id || primaryImageId === target.previewUrl)) {
      setPrimaryImageId(null);
    }

    if (target.id) {
      deleteProductImage(target.id)
        .then(() => setExistingImages((current) => current.filter((image) => image.id !== target.id)))
        .catch((deleteError) => setError(deleteError.message));
    } else {
      setStagedUploads((current) => current.filter((image) => image.previewUrl !== target.previewUrl));
    }
  };

  const handleSetPrimary = (target) => {
    if (target.id && isEdit) {
      setPrimaryProductImage({ imageId: target.id, productId: product.id })
        .then(() => setPrimaryImageId(target.id))
        .catch((primaryError) => setError(primaryError.message));
    } else {
      setPrimaryImageId(target.id || target.previewUrl);
    }
  };

  const handleSave = async (andAddAnother = false) => {
    setError("");
    if (!name.trim()) {
      setError("A product name is required.");
      return;
    }
    if (!sellingPrice || Number.isNaN(sellNum) || sellNum < 0) {
      setError("Enter a valid selling price.");
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
        unitOfMeasure: unitOfMeasure.trim() || "pcs",
        costPriceMinorUnits: costNum ? Math.round(costNum * 100) : null,
        sellingPriceMinorUnits: Math.round(sellNum * 100),
        mrpMinorUnits: mrp && !Number.isNaN(parseFloat(mrp)) ? Math.round(parseFloat(mrp) * 100) : null,
        taxConfiguration,
        taxRate: parseFloat(taxRate) || 0,
        hasVariants,
        batchTrackingEnabled: batchTracking,
        expiryTrackingEnabled: expiryTracking,
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
        status,
        storeVisibility,
        initialStock: parseInt(initialStock, 10) || 0,
        variants: hasVariants
          ? variants.map((variant) => ({
              id: variant.id,
              variantName: variant.variantName,
              sku: variant.sku || null,
              barcode: variant.barcode || null,
              costPriceMinorUnits: variant.costPriceMinorUnits,
              sellingPriceMinorUnits:
                variant.sellingPriceMinorUnits ?? Math.round(sellNum * 100),
              mrpMinorUnits: variant.mrpMinorUnits,
              lowStockThreshold: variant.lowStockThreshold || 5,
              initialStock: parseInt(variant.initialStock, 10) || 0,
              isActive: variant.isActive ?? true,
            }))
          : [],
      };

      const savedProduct = isEdit
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);

      if (stagedUploads.length > 0 && savedProduct?.id) {
        const stagedPrimary = stagedUploads.find((upload) => upload.previewUrl === primaryImageId);
        for (let index = 0; index < stagedUploads.length; index += 1) {
          const upload = stagedUploads[index];
          const isPrimary = stagedPrimary
            ? upload.previewUrl === stagedPrimary.previewUrl
            : index === 0 && existingImages.length === 0 && !primaryImageId;
          await uploadProductImage({
            productId: savedProduct.id,
            filename: upload.filename,
            base64Data: upload.base64Data,
            isPrimary,
          });
        }
      }

      onSaved?.(savedProduct);

      if (andAddAnother) {
        setName("");
        setBrand("");
        setSku("");
        setBarcode("");
        setShortDescription("");
        setDescription("");
        setSellingPrice("");
        setCostPrice("");
        setMrp("");
        setInitialStock("0");
        setPrimaryImageId(null);
        setStagedUploads([]);
        setVariants([]);
        setHasVariants(false);
        setError("");
      } else {
        onClose();
      }
    } catch (saveError) {
      console.error("Save product error:", saveError);
      setError(saveError?.message || "The product could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      icon={Package}
      title={isEdit ? "Edit product" : "Add new product"}
      description={
        isEdit
          ? "Update pricing, stock configuration and catalogue details."
          : "Create a catalogue item with pricing, stock and variants."
      }
      size="lg"
      bodyClassName="space-y-4"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {!isEdit ? (
            <Button variant="secondary" onClick={() => handleSave(true)} disabled={saving}>
              Save &amp; add another
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Update product" : "Save product"}
          </Button>
        </>
      }
    >
      {error ? <InlineAlert title="Could not save product">{error}</InlineAlert> : null}

      <EditorSection
        icon={Package}
        title="Product media"
        description="Primary image is used across the catalogue and member store."
      >
        <ProductImageUploader
          images={[...existingImages, ...stagedUploads]}
          primaryImageId={primaryImageId}
          onImagesChange={handleStageImage}
          onDeleteImage={handleDeleteStagedImage}
          onSetPrimary={handleSetPrimary}
        />
      </EditorSection>

      <EditorSection
        icon={Boxes}
        title="Basic information"
        description="How the product is identified in your catalogue."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label="Product name"
            required
            placeholder="e.g. NitroTech Whey Gold 2kg"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Brand"
            placeholder="e.g. MuscleTech"
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
          />
          <DropdownField
            label="Category"
            value={categoryId}
            onChange={setCategoryId}
            options={categoryOptions}
            placeholder="No category"
            size="lg"
          />
          <TextField
            label="SKU code"
            placeholder="e.g. WHEY-GOLD-2K"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            inputClassName="font-mono"
          />
          <TextField
            label="Barcode / UPC"
            placeholder="e.g. 890123456789"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            inputClassName="font-mono"
          />
          <TextField
            className="sm:col-span-2"
            label="Short summary"
            placeholder="One line shown on catalogue cards"
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
          />
          <TextAreaField
            className="sm:col-span-2"
            label="Internal description"
            rows={2}
            placeholder="Optional notes about this product"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </EditorSection>

      <EditorSection
        icon={IndianRupee}
        title="Pricing & margin"
        description="Amounts are stored in paise and shown in rupees."
        aside={
          marginPercent != null ? (
            <Badge tone={Number(marginPercent) >= 0 ? "emerald" : "rose"}>
              <Sparkles size={10} aria-hidden="true" /> {marginPercent}% margin
            </Badge>
          ) : null
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField
            label="Selling price (₹)"
            required
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={sellingPrice}
            onChange={(event) => setSellingPrice(event.target.value)}
          />
          <TextField
            label="Purchase cost (₹)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={costPrice}
            onChange={(event) => setCostPrice(event.target.value)}
          />
          <TextField
            label="MRP (₹)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={mrp}
            onChange={(event) => setMrp(event.target.value)}
          />
        </div>
      </EditorSection>

      {!hasVariants ? (
        <EditorSection
          icon={Package}
          title="Stock configuration"
          description={
            isEdit
              ? "Balances change through receive and adjustment operations."
              : "Opening stock is recorded as the first ledger movement."
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextField
              label={isEdit ? "Stock balance" : "Opening stock"}
              type="number"
              min="0"
              disabled={isEdit}
              value={initialStock}
              onChange={(event) => setInitialStock(event.target.value)}
              hint={isEdit ? "Use stock adjustment to change this." : undefined}
            />
            <TextField
              label="Low stock alert at"
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(event) => setLowStockThreshold(event.target.value)}
            />
            <TextField
              label="Unit of measure"
              placeholder="pcs"
              value={unitOfMeasure}
              onChange={(event) => setUnitOfMeasure(event.target.value)}
            />
          </div>
        </EditorSection>
      ) : null}

      <EditorSection
        icon={Boxes}
        title="Tracking options"
        description="Enable only what this product actually needs."
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <Switch
            checked={hasVariants}
            onChange={setHasVariants}
            label="Product variants"
            description="Flavours, sizes or colours with separate stock."
          />
          <Switch
            checked={expiryTracking}
            onChange={setExpiryTracking}
            label="Expiry tracking"
            description="For supplements and edible stock."
          />
          <Switch
            checked={batchTracking}
            onChange={setBatchTracking}
            label="Batch tracking"
            description="Track supplier batches and shelf rotation."
          />
        </div>
      </EditorSection>

      {hasVariants ? (
        <EditorSection
          icon={Boxes}
          title="Product variants"
          description="Stock is tracked individually for every variant."
          aside={
            <Button size="sm" variant="secondary" leftIcon={Plus} onClick={handleAddVariant}>
              Add variant
            </Button>
          }
        >
          {variants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-[11.5px] text-slate-400">
              No variants added yet. Add at least one to track variant-level stock.
            </p>
          ) : (
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div
                  key={variant.id || index}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 p-2.5"
                >
                  <div className="flex items-start gap-2">
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_106px_86px]">
                      <TextField
                        label="Variant"
                        placeholder="e.g. Chocolate 1kg"
                        value={variant.variantName}
                        onChange={(event) => handleUpdateVariant(index, "variantName", event.target.value)}
                      />
                      <TextField
                        label="Sell price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={
                          variant.sellingPriceMinorUnits
                            ? variant.sellingPriceMinorUnits / 100
                            : ""
                        }
                        onChange={(event) =>
                          handleUpdateVariant(
                            index,
                            "sellingPriceMinorUnits",
                            Math.round((parseFloat(event.target.value) || 0) * 100)
                          )
                        }
                      />
                      {isEdit ? (
                        <div>
                          <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.07em] text-slate-500">
                            In stock
                          </span>
                          <div className="flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-[12px] font-bold text-slate-600 tabular-nums">
                            {variant.availableQuantity || 0}
                          </div>
                        </div>
                      ) : (
                        <TextField
                          label="Stock"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={variant.initialStock || ""}
                          onChange={(event) => handleUpdateVariant(index, "initialStock", event.target.value)}
                        />
                      )}
                    </div>
                    <IconButton
                      label={`Remove variant ${variant.variantName || index + 1}`}
                      icon={Trash2}
                      onClick={() => handleRemoveVariant(index)}
                      className="mt-6 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </EditorSection>
      ) : null}
    </Drawer>
  );
};
