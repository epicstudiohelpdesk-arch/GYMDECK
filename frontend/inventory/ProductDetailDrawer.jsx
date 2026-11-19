import React, { useState } from "react";
import {
  X,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag,
  Boxes,
  Truck,
  Edit,
  Sliders,
  Archive,
  RotateCcw,
} from "lucide-react";
import { formatINR, formatUnits, getStockBadge } from "./InventoryShared.jsx";
import { getProductImageUrl } from "../inventoryApi.js";

export const ProductDetailDrawer = ({
  isOpen,
  onClose,
  product = null,
  onEdit,
  onAdjustStock,
  onReceiveStock,
  onArchiveToggle,
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!isOpen || !product) return null;

  const stockBadge = getStockBadge(product);
  const images = product.images && product.images.length > 0 ? product.images : [];
  const currentImage = images[activeImageIdx] || product.primary_image;
  const currentImageUrl = currentImage ? getProductImageUrl(currentImage) || currentImage.dataUrl : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl overflow-hidden animate-slide-left">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-white">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${stockBadge.className}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${stockBadge.dot}`} />
              {stockBadge.label}
            </span>
            {product.status === "ARCHIVED" ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 uppercase">
                Archived
              </span>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Visual Photo Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-video w-full rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
              {currentImageUrl ? (
                <img
                  src={currentImageUrl}
                  alt={product.name}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <Package className="h-12 w-12 text-slate-300 stroke-[1.5]" />
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => {
                  const url = getProductImageUrl(img) || img.dataUrl;
                  return (
                    <button
                      key={img.id || idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative h-14 w-14 rounded-xl border overflow-hidden shrink-0 transition-all ${
                        activeImageIdx === idx ? "border-orange-500 ring-2 ring-orange-500/20" : "border-slate-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Product Header Info */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>{product.brand || "Unbranded"}</span>
              <span>•</span>
              <span>{product.category_name || "Uncategorized"}</span>
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-900 tracking-tight">{product.name}</h2>
            {product.short_description ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{product.short_description}</p>
            ) : null}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Selling Price</p>
              <p className="mt-1 text-base font-black text-slate-900">
                {formatINR(product.selling_price_minor_units)}
              </p>
              {product.mrp_minor_units ? (
                <p className="text-[10px] line-through text-slate-400">
                  MRP {formatINR(product.mrp_minor_units)}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Available Stock</p>
              <p className="mt-1 text-base font-black text-emerald-600">
                {formatUnits(product.available_quantity, product.unit_of_measure)}
              </p>
              <p className="text-[10px] text-slate-400">
                Alert at: {product.low_stock_threshold || 5}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Purchase Cost</p>
              <p className="mt-1 text-base font-black text-slate-600">
                {product.cost_price_minor_units ? formatINR(product.cost_price_minor_units) : "N/A"}
              </p>
              <p className="text-[10px] text-slate-400">Owner Confidential</p>
            </div>
          </div>

          {/* Identifiers & Details */}
          <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Specifications & Identifiers
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div>
                <span className="font-semibold text-slate-400">SKU:</span>{" "}
                <span className="font-mono font-bold text-slate-800">{product.sku || "—"}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Barcode:</span>{" "}
                <span className="font-mono font-bold text-slate-800">{product.barcode || "—"}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Store Visibility:</span>{" "}
                <span className="font-bold text-slate-800">{product.store_visibility}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Tax Type:</span>{" "}
                <span className="font-bold text-slate-800">{product.tax_configuration || "EXEMPT"}</span>
              </div>
            </div>
          </div>

          {/* Variants List if present */}
          {product.has_variants && product.variants?.length > 0 ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Product Variants ({product.variants.length})
              </h4>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                {product.variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-white">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{v.variant_name}</p>
                      {v.sku ? <p className="text-[10px] font-mono text-slate-400">SKU: {v.sku}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">
                        {formatINR(v.selling_price_minor_units)}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-600">
                        {v.available_quantity || 0} in stock
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Future Member App Store Readiness Notice */}
          <div className="rounded-2xl border border-orange-200/60 bg-orange-50/40 p-4 text-xs text-orange-900 flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Member App Store Sync Ready</p>
              <p className="mt-0.5 text-[11px] text-orange-700 leading-relaxed">
                This item is isolated under your gym tenant and pre-configured for the future Member App
                Store. Only active products marked as visible will be published to members.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
          <button
            onClick={() => onArchiveToggle?.(product)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
          >
            {product.status === "ARCHIVED" ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" /> Unarchive
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5" /> Archive
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onReceiveStock?.(product)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition-all"
            >
              <Truck className="h-3.5 w-3.5 text-emerald-600" /> Receive Stock
            </button>

            <button
              onClick={() => onAdjustStock?.(product)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-orange-500 hover:text-orange-700 transition-all"
            >
              <Sliders className="h-3.5 w-3.5 text-orange-500" /> Adjust Stock
            </button>

            <button
              onClick={() => onEdit?.(product)}
              className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/25 transition-all hover:shadow-orange-500/35"
            >
              <Edit className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
