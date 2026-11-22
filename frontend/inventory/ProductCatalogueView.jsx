import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Boxes,
  Grid,
  List,
  Package,
  Pencil,
  Plus,
  Search,
  Sliders,
  Truck,
  X,
} from "lucide-react";
import { formatINR, formatUnits, getStockState } from "./InventoryShared.jsx";
import {
  Badge,
  Button,
  Card,
  Dropdown,
  EmptyState,
  SearchField,
  Segmented,
} from "./InventoryUI.jsx";
import { fetchProductImageDataUrl, getProductImageUrl } from "../inventoryApi.js";

const SORT_OPTIONS = [
  { value: "NAME_ASC", label: "Name · A to Z" },
  { value: "NAME_DESC", label: "Name · Z to A" },
  { value: "PRICE_DESC", label: "Price · high to low" },
  { value: "PRICE_ASC", label: "Price · low to high" },
  { value: "STOCK_DESC", label: "Stock · high to low" },
  { value: "STOCK_ASC", label: "Stock · low to high" },
];

const STOCK_OPTIONS = [
  { value: "ALL", label: "All stock levels" },
  { value: "IN_STOCK", label: "In stock" },
  { value: "LOW_STOCK", label: "Low stock" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active products" },
  { value: "ARCHIVED", label: "Archived products" },
  { value: "ALL", label: "All products" },
];

const ProductThumb = ({ product, className = "" }) => {
  const targetImage = product.primary_image || (product.images && product.images[0]);
  const initialUrl = targetImage
    ? getProductImageUrl(targetImage) || targetImage.dataUrl
    : null;

  const [resolvedSrc, setResolvedSrc] = useState(initialUrl);

  useEffect(() => {
    let isCurrent = true;
    const directUrl = targetImage ? getProductImageUrl(targetImage) || targetImage.dataUrl : null;
    if (directUrl) {
      setResolvedSrc(directUrl);
    }

    if (targetImage?.storage_key) {
      fetchProductImageDataUrl(targetImage).then((dataUrl) => {
        if (isCurrent && dataUrl) {
          setResolvedSrc(dataUrl);
        }
      });
    }

    return () => {
      isCurrent = false;
    };
  }, [targetImage]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-slate-100/60 transition-colors ${className}`}
    >
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={product.name || ""}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 text-slate-300">
          <Package size={28} strokeWidth={1.4} aria-hidden="true" />
          <span className="text-[10px] font-medium text-slate-400">No Image</span>
        </div>
      )}
    </div>
  );
};

export const ProductCatalogueView = ({
  products = [],
  categories = [],
  onSelectProduct,
  onEditProduct,
  onAdjustStock,
  onReceiveStock,
  onAddProduct,
}) => {
  const [viewMode, setViewMode] = useState("grid");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NAME_ASC");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  const categoryOptions = useMemo(
    () => [
      { value: "ALL", label: "All categories" },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      if (statusFilter !== "ALL" && product.status !== statusFilter) return false;
      if (selectedCategory !== "ALL" && product.category_id !== selectedCategory) return false;

      const quantity = Number(product.available_quantity) || 0;
      const threshold = Number(product.low_stock_threshold) || 5;
      if (stockFilter === "IN_STOCK" && quantity <= threshold) return false;
      if (stockFilter === "LOW_STOCK" && (quantity <= 0 || quantity > threshold)) return false;
      if (stockFilter === "OUT_OF_STOCK" && quantity > 0) return false;

      if (query) {
        const haystack = [product.name, product.brand, product.sku, product.barcode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [products, search, selectedCategory, stockFilter, statusFilter]);

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    sorted.sort((a, b) => {
      if (sortBy === "NAME_ASC") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "NAME_DESC") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "PRICE_ASC") return (a.selling_price_minor_units || 0) - (b.selling_price_minor_units || 0);
      if (sortBy === "PRICE_DESC") return (b.selling_price_minor_units || 0) - (a.selling_price_minor_units || 0);
      if (sortBy === "STOCK_ASC") return (a.available_quantity || 0) - (b.available_quantity || 0);
      if (sortBy === "STOCK_DESC") return (b.available_quantity || 0) - (a.available_quantity || 0);
      return 0;
    });
    return sorted;
  }, [filteredProducts, sortBy]);

  const filtersActive =
    Boolean(search.trim()) ||
    selectedCategory !== "ALL" ||
    stockFilter !== "ALL" ||
    statusFilter !== "ACTIVE" ||
    sortBy !== "NAME_ASC";

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
    setStockFilter("ALL");
    setStatusFilter("ACTIVE");
    setSortBy("NAME_ASC");
  };

  return (
    <div className="space-y-4">
      <Card className="p-3 sm:p-4 border-slate-200/90 shadow-xs">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by name, brand, SKU or barcode…"
            ariaLabel="Search products"
            className="w-full xl:max-w-md"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Dropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              ariaLabel="Filter by category"
              leadingIcon={Boxes}
              className="w-full sm:w-[170px]"
            />
            <Dropdown
              value={stockFilter}
              onChange={setStockFilter}
              options={STOCK_OPTIONS}
              ariaLabel="Filter by stock level"
              className="w-[calc(50%-4px)] sm:w-[150px]"
            />
            <Dropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              ariaLabel="Filter by product status"
              className="w-[calc(50%-4px)] sm:w-[150px]"
            />
            <Dropdown
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              ariaLabel="Sort products"
              leadingIcon={ArrowUpDown}
              className="w-[calc(100%-60px)] sm:w-[160px]"
            />
            <Segmented
              ariaLabel="Catalogue view"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "grid", icon: Grid, label: "Grid", ariaLabel: "Grid view", showLabel: false },
                { value: "list", icon: List, label: "List", ariaLabel: "List view", showLabel: false },
              ]}
              className="shrink-0"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <p className="text-[11.5px] font-medium text-slate-500">
              Showing <span className="font-bold text-slate-800 tabular-nums">{sortedProducts.length}</span> of{" "}
              <span className="font-bold text-slate-800 tabular-nums">{products.length}</span> items
            </p>
            {selectedCategory !== "ALL" && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-[10.5px] font-semibold text-orange-700">
                Category: {categoryOptions.find((c) => c.value === selectedCategory)?.label}
              </span>
            )}
            {stockFilter !== "ALL" && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
                Stock: {STOCK_OPTIONS.find((s) => s.value === stockFilter)?.label}
              </span>
            )}
          </div>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-200/80 hover:text-slate-800"
            >
              <X size={12} strokeWidth={2.4} aria-hidden="true" /> Reset filters
            </button>
          ) : null}
        </div>
      </Card>

      {sortedProducts.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No products match these filters"
          description="Try a different search term, or reset the category, stock and status filters."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Reset filters
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
          {sortedProducts.map((product) => {
            const stock = getStockState(product);
            const discountPercent =
              product.mrp_minor_units && product.selling_price_minor_units && product.mrp_minor_units > product.selling_price_minor_units
                ? Math.round(((product.mrp_minor_units - product.selling_price_minor_units) / product.mrp_minor_units) * 100)
                : null;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group"
              >
                {/* 1. Ecommerce Product Media Showcase (Compact Fixed Height Proportion) */}
                <div
                  onClick={() => onSelectProduct?.(product)}
                  className="relative h-44 w-full overflow-hidden bg-slate-50 cursor-pointer border-b border-slate-100 flex items-center justify-center"
                >
                  <ProductThumb product={product} className="h-full w-full" />

                  {/* Stock Status Badge (Top-Left) */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight shadow-xs flex items-center gap-1 border ${
                      stock.tone === "emerald"
                        ? "bg-white text-emerald-700 border-emerald-200"
                        : stock.tone === "amber"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        stock.tone === "emerald" ? "bg-emerald-500" : stock.tone === "amber" ? "bg-amber-500" : "bg-rose-500"
                      }`} />
                      {stock.label}
                    </span>
                  </div>

                  {/* Discount / Offer Tag (Top-Right) */}
                  {discountPercent ? (
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black tracking-tight shadow-xs">
                        {discountPercent}% OFF
                      </span>
                    </div>
                  ) : null}

                  {/* Edit Button Shortcut (Visible on hover) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProduct?.(product);
                    }}
                    className="absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-lg bg-white/95 hover:bg-white text-slate-500 hover:text-indigo-600 border border-slate-200/90 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Edit product"
                  >
                    <Pencil size={13} strokeWidth={2.4} />
                  </button>
                </div>

                {/* 2. Product Information Details */}
                <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                  <div className="space-y-1">
                    {/* Brand & Category Subhead */}
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span className="uppercase tracking-wider truncate max-w-[130px]">
                        {product.brand || "Generic"}
                      </span>
                      <span className="text-slate-500 truncate max-w-[110px] bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {product.category_name || "General"}
                      </span>
                    </div>

                    {/* Product Title */}
                    <h4
                      onClick={() => onSelectProduct?.(product)}
                      className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-indigo-600 cursor-pointer transition-colors"
                      title={product.name}
                    >
                      {product.name}
                    </h4>

                    {/* SKU & Barcode subtitle */}
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {product.sku ? `SKU: ${product.sku}` : product.barcode ? `BAR: ${product.barcode}` : "—"}
                    </div>
                  </div>

                  {/* 3. Price & Stock Counter */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-black text-slate-900 tabular-nums tracking-tight">
                          {formatINR(product.selling_price_minor_units)}
                        </span>
                        {product.mrp_minor_units && product.mrp_minor_units > (product.selling_price_minor_units || 0) && (
                          <span className="text-xs text-slate-400 line-through tabular-nums">
                            {formatINR(product.mrp_minor_units)}
                          </span>
                        )}
                      </div>
                      {discountPercent ? (
                        <p className="text-[10.5px] font-bold text-emerald-600">
                          Save {formatINR(product.mrp_minor_units - (product.selling_price_minor_units || 0))}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400">Retail price</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Stock</span>
                      <span className={`text-xs font-bold tabular-nums ${stock.text}`}>
                        {formatUnits(product.available_quantity, product.unit_of_measure)}
                      </span>
                    </div>
                  </div>

                  {/* 4. Action Buttons (Receive & Adjust Stock) */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onReceiveStock?.(product)}
                      className="h-8 px-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                      title="Receive incoming stock"
                    >
                      <Truck size={13} strokeWidth={2.2} className="text-emerald-600" />
                      <span>Receive</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onAdjustStock?.(product)}
                      className="h-8 px-2 rounded-lg bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                      title="Adjust inventory"
                    >
                      <Sliders size={13} strokeWidth={2.2} className="text-amber-600" />
                      <span>Adjust</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden border-slate-200/90 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-200/90 bg-slate-100/70 text-[10.5px] font-bold uppercase tracking-[0.07em] text-slate-500">
                  <th scope="col" className="px-5 py-3 font-bold">Product</th>
                  <th scope="col" className="px-4 py-3 font-bold">Category</th>
                  <th scope="col" className="px-4 py-3 font-bold">SKU / Barcode</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">Sell price</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">In stock</th>
                  <th scope="col" className="px-4 py-3 text-center font-bold">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedProducts.map((product) => {
                  const stock = getStockState(product);
                  return (
                    <tr key={product.id} className="group transition-colors hover:bg-slate-50/80">
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => onSelectProduct?.(product)}
                          className="flex items-center gap-3 text-left focus-visible:outline-none"
                        >
                          <ProductThumb
                            product={product}
                            className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 shadow-2xs"
                          />
                          <span className="min-w-0">
                            <span className="block max-w-[280px] truncate font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                              {product.name}
                            </span>
                            <span className="block text-[11px] text-slate-400">
                              {product.brand || "Unbranded"}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {product.category_name || "General"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {product.sku || product.barcode || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatINR(product.selling_price_minor_units)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${stock.text}`}>
                        {formatUnits(product.available_quantity, product.unit_of_measure)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone={stock.tone} dot>{stock.label}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onReceiveStock?.(product)}
                            className="text-emerald-700 hover:bg-emerald-100/70"
                            aria-label={`Receive stock for ${product.name}`}
                          >
                            Receive
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onAdjustStock?.(product)}
                            className="text-slate-700 hover:bg-slate-200/70"
                            aria-label={`Adjust stock for ${product.name}`}
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onEditProduct?.(product)}
                            leftIcon={Pencil}
                            aria-label={`Edit ${product.name}`}
                            className="text-orange-700 hover:bg-orange-100/70 font-semibold"
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/70 px-5 py-3">
            <p className="text-[11.5px] font-medium text-slate-500">
              Showing <span className="font-bold text-slate-700 tabular-nums">{sortedProducts.length}</span> product{sortedProducts.length === 1 ? "" : "s"}
            </p>
            {onAddProduct ? (
              <Button size="sm" variant="secondary" leftIcon={Plus} onClick={onAddProduct}>
                Add product
              </Button>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
};
