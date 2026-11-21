import React, { useMemo, useState } from "react";
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
import { getProductImageUrl } from "../inventoryApi.js";

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
  const imageUrl = product.primary_image
    ? getProductImageUrl(product.primary_image) || product.primary_image.dataUrl
    : null;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/80 ${className}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <Package size={22} className="text-slate-300" strokeWidth={1.6} aria-hidden="true" />
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
      <Card className="p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search name, brand, SKU or barcode…"
            ariaLabel="Search products"
            className="w-full xl:max-w-sm"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Dropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              ariaLabel="Filter by category"
              leadingIcon={Boxes}
              className="w-[170px]"
            />
            <Dropdown
              value={stockFilter}
              onChange={setStockFilter}
              options={STOCK_OPTIONS}
              ariaLabel="Filter by stock level"
              className="w-[150px]"
            />
            <Dropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              ariaLabel="Filter by product status"
              className="w-[150px]"
            />
            <Dropdown
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              ariaLabel="Sort products"
              leadingIcon={ArrowUpDown}
              className="w-[160px]"
            />
            <Segmented
              ariaLabel="Catalogue view"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "grid", icon: Grid, label: "Grid", ariaLabel: "Grid view", showLabel: false },
                { value: "list", icon: List, label: "List", ariaLabel: "List view", showLabel: false },
              ]}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
          <p className="text-[11px] font-medium text-slate-500">
            Showing <span className="font-bold text-slate-700 tabular-nums">{sortedProducts.length}</span> of{" "}
            <span className="font-bold text-slate-700 tabular-nums">{products.length}</span> products
          </p>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={11} strokeWidth={2.4} aria-hidden="true" /> Clear filters
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedProducts.map((product) => {
            const stock = getStockState(product);
            return (
              <article
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => onSelectProduct?.(product)}
                  aria-label={`View ${product.name}`}
                  className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/40"
                >
                  <div className="relative">
                    <ProductThumb product={product} className="aspect-[4/3] w-full border-b border-slate-100" />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <Badge tone={stock.tone} dot>{stock.label}</Badge>
                      {product.status === "ARCHIVED" ? <Badge tone="slate">Archived</Badge> : null}
                    </div>
                    {product.has_variants ? (
                      <span className="absolute right-3 top-3 rounded-md border border-slate-200 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 backdrop-blur-sm">
                        Variants
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 p-4 pb-3">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400">
                      <span className="truncate">{product.brand || "Unbranded"}</span>
                      <span className="truncate text-right">{product.category_name || "General"}</span>
                    </div>
                    <h3 className="line-clamp-2 min-h-[34px] text-[13.5px] font-bold leading-[1.3] text-slate-900 transition-colors group-hover:text-orange-600">
                      {product.name}
                    </h3>
                    <p className="truncate font-mono text-[10.5px] text-slate-400">
                      {product.sku ? `SKU ${product.sku}` : product.barcode || "No SKU assigned"}
                    </p>
                    <div className="mt-1 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[15px] font-extrabold leading-tight tracking-tight text-slate-900 tabular-nums">
                          {formatINR(product.selling_price_minor_units)}
                        </p>
                        {product.mrp_minor_units ? (
                          <p className="text-[10.5px] text-slate-400 line-through tabular-nums">
                            {formatINR(product.mrp_minor_units)}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className={`text-[12px] font-bold tabular-nums ${stock.text}`}>
                          {formatUnits(product.available_quantity, product.unit_of_measure)}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">available</p>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-0.5 border-t border-slate-100 bg-slate-50/70 px-2 py-1.5">
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={Truck}
                    onClick={() => onReceiveStock?.(product)}
                    className="text-emerald-700 hover:bg-emerald-50"
                  >
                    Receive
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={Sliders}
                    onClick={() => onAdjustStock?.(product)}
                  >
                    Adjust
                  </Button>
                  <span className="flex-1" />
                  <Button
                    variant="ghost"
                    size="xs"
                    leftIcon={Pencil}
                    onClick={() => onEditProduct?.(product)}
                    className="text-orange-700 hover:bg-orange-50"
                  >
                    Edit
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                  <th scope="col" className="px-4 py-2.5 font-bold">Product</th>
                  <th scope="col" className="px-4 py-2.5 font-bold">Category</th>
                  <th scope="col" className="px-4 py-2.5 font-bold">SKU / Barcode</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-bold">Sell price</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-bold">In stock</th>
                  <th scope="col" className="px-4 py-2.5 text-center font-bold">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedProducts.map((product) => {
                  const stock = getStockState(product);
                  return (
                    <tr key={product.id} className="group transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectProduct?.(product)}
                          className="flex items-center gap-3 text-left focus-visible:outline-none"
                        >
                          <ProductThumb
                            product={product}
                            className="h-10 w-10 shrink-0 rounded-xl border border-slate-200"
                          />
                          <span className="min-w-0">
                            <span className="block max-w-[260px] truncate font-bold text-slate-900 group-hover:text-orange-600">
                              {product.name}
                            </span>
                            <span className="block text-[10.5px] text-slate-400">
                              {product.brand || "Unbranded"}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{product.category_name || "General"}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                        {product.sku || product.barcode || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums">
                        {formatINR(product.selling_price_minor_units)}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${stock.text}`}>
                        {formatUnits(product.available_quantity, product.unit_of_measure)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge tone={stock.tone} dot>{stock.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onReceiveStock?.(product)}
                            className="text-emerald-700 hover:bg-emerald-50"
                            aria-label={`Receive stock for ${product.name}`}
                          >
                            Receive
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onAdjustStock?.(product)}
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
                            className="text-orange-700 hover:bg-orange-50"
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
          <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/60 px-4 py-2.5">
            <p className="text-[11px] text-slate-500">
              {sortedProducts.length} product{sortedProducts.length === 1 ? "" : "s"} listed
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
