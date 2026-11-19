import React, { useState } from "react";
import {
  Package,
  Layers,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Plus,
  ArrowUpDown,
  Tag,
  AlertCircle,
  Truck,
  Sliders,
  Eye,
  Archive,
} from "lucide-react";
import { formatINR, formatUnits, getStockBadge } from "./InventoryShared.jsx";
import { getProductImageUrl } from "../inventoryApi.js";

export const ProductCatalogueView = ({
  products = [],
  categories = [],
  onSelectProduct,
  onEditProduct,
  onAdjustStock,
  onReceiveStock,
  onAddProduct,
}) => {
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("NAME_ASC");
  const [statusFilter, setStatusFilter] = useState("ACTIVE"); // "ACTIVE" | "ARCHIVED" | "ALL"

  // Filter & Search Logic
  const filteredProducts = products.filter((p) => {
    // Status
    if (statusFilter !== "ALL" && p.status !== statusFilter) {
      return false;
    }

    // Category
    if (selectedCategory !== "ALL" && p.category_id !== selectedCategory) {
      return false;
    }

    // Stock Status
    const qty = p.available_quantity || 0;
    const threshold = p.low_stock_threshold || 5;
    if (stockFilter === "IN_STOCK" && qty <= threshold) return false;
    if (stockFilter === "LOW_STOCK" && (qty <= 0 || qty > threshold)) return false;
    if (stockFilter === "OUT_OF_STOCK" && qty > 0) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchBrand = p.brand?.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      const matchBarcode = p.barcode?.toLowerCase().includes(q);
      if (!matchName && !matchBrand && !matchSku && !matchBarcode) return false;
    }

    return true;
  });

  // Sort Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "NAME_ASC") return a.name.localeCompare(b.name);
    if (sortBy === "NAME_DESC") return b.name.localeCompare(a.name);
    if (sortBy === "PRICE_ASC") return a.selling_price_minor_units - b.selling_price_minor_units;
    if (sortBy === "PRICE_DESC") return b.selling_price_minor_units - a.selling_price_minor_units;
    if (sortBy === "STOCK_ASC") return (a.available_quantity || 0) - (b.available_quantity || 0);
    if (sortBy === "STOCK_DESC") return (b.available_quantity || 0) - (a.available_quantity || 0);
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs">
        {/* Left: Search input */}
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, brand, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
          />
        </div>

        {/* Right: Filters & Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
          >
            <option value="NAME_ASC">Name (A → Z)</option>
            <option value="NAME_DESC">Name (Z → A)</option>
            <option value="PRICE_ASC">Price (Low → High)</option>
            <option value="PRICE_DESC">Price (High → Low)</option>
            <option value="STOCK_DESC">Highest Stock</option>
            <option value="STOCK_ASC">Lowest Stock</option>
          </select>

          {/* Status filter: Active vs Archived */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
          >
            <option value="ACTIVE">Active Products</option>
            <option value="ARCHIVED">Archived Products</option>
            <option value="ALL">All Products</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-white text-orange-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-white text-orange-600 shadow-2xs" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Content: Grid or List */}
      {sortedProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-300 stroke-[1.5]" />
          <p className="mt-3 text-sm font-bold text-slate-700">No products match your filters</p>
          <p className="mt-1 text-xs text-slate-400">Try adjusting your search query, status or category filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedProducts.map((p) => {
            const badge = getStockBadge(p);
            const imgUrl = p.primary_image ? getProductImageUrl(p.primary_image) || p.primary_image.dataUrl : null;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProduct?.(p)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
              >
                {/* Image Top */}
                <div className="relative aspect-square w-full bg-slate-50/80 overflow-hidden flex items-center justify-center border-b border-slate-100">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-slate-300 stroke-[1.5]" />
                  )}

                  {/* Stock Badge */}
                  <span
                    className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border backdrop-blur-xs ${badge.className}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>

                  {p.has_variants ? (
                    <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/60 backdrop-blur-xs text-white px-1.5 py-0.5 text-[9px] font-bold">
                      Variants
                    </span>
                  ) : null}
                </div>

                {/* Content Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                      <span>{p.brand || "Unbranded"}</span>
                      <span>{p.category_name || "General"}</span>
                    </div>
                    <h4 className="mt-1 text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                      {p.name}
                    </h4>
                    {p.sku ? (
                      <p className="mt-0.5 text-[10px] font-mono text-slate-400">SKU: {p.sku}</p>
                    ) : null}
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-900 tracking-tight">
                        {formatINR(p.selling_price_minor_units)}
                      </p>
                      {p.mrp_minor_units ? (
                        <p className="text-[10px] line-through text-slate-400">
                          {formatINR(p.mrp_minor_units)}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-600">
                        {formatUnits(p.available_quantity, p.unit_of_measure)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action footer */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-xs"
                >
                  <button
                    onClick={() => onReceiveStock?.(p)}
                    title="Receive stock purchase"
                    className="flex items-center gap-1 font-bold text-slate-600 hover:text-emerald-700 transition-colors"
                  >
                    <Truck className="h-3.5 w-3.5 text-emerald-600" /> +Stock
                  </button>
                  <button
                    onClick={() => onAdjustStock?.(p)}
                    title="Adjust stock balance"
                    className="flex items-center gap-1 font-bold text-slate-600 hover:text-orange-600 transition-colors"
                  >
                    <Sliders className="h-3.5 w-3.5 text-orange-500" /> Adjust
                  </button>
                  <button
                    onClick={() => onEditProduct?.(p)}
                    className="font-bold text-orange-600 hover:text-orange-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4 text-right">Sell Price</th>
                <th className="py-3 px-4 text-right">In Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedProducts.map((p) => {
                const badge = getStockBadge(p);
                const imgUrl = p.primary_image ? getProductImageUrl(p.primary_image) || p.primary_image.dataUrl : null;

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProduct?.(p)}
                    className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200">
                          {imgUrl ? (
                            <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.brand || "Unbranded"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-600">
                      {p.category_name || "General"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {p.sku || p.barcode || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatINR(p.selling_price_minor_units)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600">
                      {formatUnits(p.available_quantity, p.unit_of_measure)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${badge.className}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>
                    <td
                      onClick={(e) => e.stopPropagation()}
                      className="py-3 px-4 text-right space-x-2"
                    >
                      <button
                        onClick={() => onReceiveStock?.(p)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        Receive
                      </button>
                      <button
                        onClick={() => onAdjustStock?.(p)}
                        className="text-xs font-bold text-slate-600 hover:text-orange-600"
                      >
                        Adjust
                      </button>
                      <button
                        onClick={() => onEditProduct?.(p)}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
