import React, { useState } from "react";
import {
  Archive,
  Boxes,
  Edit,
  Package,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Tag,
  Truck,
} from "lucide-react";
import { formatINR, formatUnits, getStockState } from "./InventoryShared.jsx";
import {
  Badge,
  Button,
  Drawer,
  SectionHeading,
} from "./InventoryUI.jsx";
import { getProductImageUrl } from "../inventoryApi.js";

const pretty = (value) =>
  String(value || "—")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (character) => character.toUpperCase());

const SpecItem = ({ label, value, mono }) => (
  <div>
    <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">{label}</p>
    <p className={`mt-0.5 text-[12px] font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>
      {value || "—"}
    </p>
  </div>
);

export const ProductDetailDrawer = ({
  isOpen,
  onClose,
  product = null,
  onEdit,
  onAdjustStock,
  onReceiveStock,
  onArchiveToggle,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!isOpen || !product) return null;

  const stock = getStockState(product);
  const images = product.images?.length ? product.images : product.primary_image ? [product.primary_image] : [];
  const activeImage = images[activeImageIndex] || product.primary_image;
  const activeImageUrl = activeImage
    ? getProductImageUrl(activeImage) || activeImage.dataUrl
    : null;
  const isArchived = product.status === "ARCHIVED";

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      icon={Package}
      title={product.name}
      description={`${product.brand || "Unbranded"} · ${product.category_name || "General"}`}
      size="lg"
      bodyClassName="space-y-4"
      footer={
        <>
          <Button
            variant={isArchived ? "secondary" : "danger"}
            size="md"
            leftIcon={isArchived ? RotateCcw : Archive}
            onClick={() => onArchiveToggle?.(product)}
            className="mr-auto"
          >
            {isArchived ? "Unarchive" : "Archive"}
          </Button>
          <Button variant="secondary" leftIcon={Truck} onClick={() => onReceiveStock?.(product)}>
            Receive
          </Button>
          <Button variant="secondary" leftIcon={Sliders} onClick={() => onAdjustStock?.(product)}>
            Adjust
          </Button>
          <Button variant="primary" leftIcon={Edit} onClick={() => onEdit?.(product)}>
            Edit
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={stock.tone} dot>{stock.label}</Badge>
        {isArchived ? <Badge tone="slate">Archived</Badge> : null}
        {product.has_variants ? <Badge tone="sky">Variants</Badge> : null}
        <Badge tone="slate">{formatUnits(product.available_quantity, product.unit_of_measure)} available</Badge>
      </div>

      {product.short_description ? (
        <p className="text-[12px] leading-5 text-slate-500">{product.short_description}</p>
      ) : null}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          {activeImageUrl ? (
            <img src={activeImageUrl} alt={product.name} className="h-full w-full object-contain p-2" />
          ) : (
            <Package size={34} className="text-slate-300" strokeWidth={1.5} aria-hidden="true" />
          )}
        </div>
        {images.length > 1 ? (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
            {images.map((image, index) => {
              const url = getProductImageUrl(image) || image.dataUrl;
              return (
                <button
                  key={image.id || index}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border ${
                    activeImageIndex === index
                      ? "border-orange-400 ring-2 ring-orange-500/15"
                      : "border-slate-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">Selling price</p>
          <p className="mt-1 text-[18px] font-extrabold leading-tight tracking-tight text-slate-900 tabular-nums">
            {formatINR(product.selling_price_minor_units)}
          </p>
          {product.mrp_minor_units ? (
            <p className="text-[10.5px] text-slate-400 line-through tabular-nums">
              MRP {formatINR(product.mrp_minor_units)}
            </p>
          ) : null}
        </div>
        <div className="p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">Available stock</p>
          <p className={`mt-1 text-[18px] font-extrabold leading-tight tabular-nums ${stock.text}`}>
            {formatUnits(product.available_quantity, product.unit_of_measure)}
          </p>
          <p className="text-[10.5px] text-slate-400">Alert at {product.low_stock_threshold || 5}</p>
        </div>
        <div className="p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">Purchase cost</p>
          <p className="mt-1 text-[18px] font-extrabold leading-tight text-slate-700 tabular-nums">
            {product.cost_price_minor_units ? formatINR(product.cost_price_minor_units) : "—"}
          </p>
          <p className="text-[10.5px] text-slate-400">Owner confidential</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <SectionHeading icon={Tag} title="Specifications & identifiers" className="mb-3" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <SpecItem label="SKU" value={product.sku} mono />
          <SpecItem label="Barcode" value={product.barcode} mono />
          <SpecItem label="Unit of measure" value={product.unit_of_measure} />
          <SpecItem label="Store visibility" value={pretty(product.store_visibility)} />
          <SpecItem label="Tax configuration" value={pretty(product.tax_configuration || "EXEMPT")} />
          <SpecItem label="Product status" value={pretty(product.status)} />
        </div>
        {product.description ? (
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11.5px] leading-5 text-slate-500">
            {product.description}
          </p>
        ) : null}
      </section>

      {product.has_variants && product.variants?.length > 0 ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <SectionHeading
            icon={Boxes}
            title="Product variants"
            description={`${product.variants.length} variant${product.variants.length === 1 ? "" : "s"} tracked separately`}
            className="mb-3"
          />
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {product.variants.map((variant) => (
              <div key={variant.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-slate-800">{variant.variant_name}</p>
                  {variant.sku ? (
                    <p className="truncate font-mono text-[10px] text-slate-400">SKU {variant.sku}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[12px] font-bold text-slate-800 tabular-nums">
                    {formatINR(variant.selling_price_minor_units)}
                  </p>
                  <p className="text-[10.5px] font-semibold text-emerald-600 tabular-nums">
                    {variant.available_quantity || 0} in stock
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex items-start gap-2.5 rounded-2xl border border-orange-200/70 bg-orange-50/50 p-3.5">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true" />
        <div>
          <p className="text-[12px] font-bold text-orange-900">Member store ready</p>
          <p className="mt-0.5 text-[11px] leading-5 text-orange-800/80">
            This item is isolated to your gym tenant. Only active products marked visible are published to the member store.
          </p>
        </div>
      </section>
    </Drawer>
  );
};
