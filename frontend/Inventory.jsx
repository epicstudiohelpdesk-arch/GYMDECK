import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Boxes,
  FileSpreadsheet,
  FolderTree,
  History,
  IndianRupee,
  Package,
  Plus,
  RefreshCw,
  Sliders,
  Truck,
  Users,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Radio,
  Zap,
  Server,
  Activity,
  Layers,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import BrandFooter from "./BrandFooter.jsx";
import { ErrorBoundary } from "./ErrorHandlers.jsx";
import { formatINR, formatCount, formatUnits } from "./inventory/InventoryShared.jsx";
import {
  Badge,
  Button,
  Dropdown,
  EmptyState,
  IconButton,
  InlineAlert,
  SkeletonBlock,
} from "./inventory/InventoryUI.jsx";
import { ProductCatalogueView } from "./inventory/ProductCatalogueView.jsx";
import { ProductEditorDrawer } from "./inventory/ProductEditorDrawer.jsx";
import { ProductDetailDrawer } from "./inventory/ProductDetailDrawer.jsx";
import { StockOperationsModal } from "./inventory/StockOperationsModal.jsx";
import { CategoryManagerModal } from "./inventory/CategoryManagerModal.jsx";
import { SupplierManagerModal } from "./inventory/SupplierManagerModal.jsx";
import { StockLedgerView } from "./inventory/StockLedgerView.jsx";
import {
  getInventoryOverview,
  listProducts,
  listCategories,
  listSuppliers,
  listStockMovements,
  listBatches,
  archiveProduct,
  unarchiveProduct,
} from "./inventoryApi.js";

// Reusable Executive KPI Stat Tile in the exact same design language as Live & Recordings
const StatTile = ({ label, value, subtext, tone = "indigo", icon: Icon }) => {
  const tones = {
    indigo: {
      icon: "text-indigo-600 bg-indigo-50 border-indigo-100",
      accent: "text-indigo-600",
    },
    emerald: {
      icon: "text-emerald-600 bg-emerald-50 border-emerald-100",
      accent: "text-emerald-600",
    },
    blue: {
      icon: "text-blue-600 bg-blue-50 border-blue-100",
      accent: "text-blue-600",
    },
    amber: {
      icon: "text-amber-600 bg-amber-50 border-amber-100",
      accent: "text-amber-600",
    },
    rose: {
      icon: "text-rose-600 bg-rose-50 border-rose-100",
      accent: "text-rose-600",
    },
    slate: {
      icon: "text-slate-700 bg-slate-100 border-slate-200",
      accent: "text-slate-800",
    },
  };

  const currentTone = tones[tone] || tones.indigo;

  return (
    <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${currentTone.icon}`}>
          <Icon size={16} strokeWidth={2.2} />
        </div>
      </div>
      <div className="flex flex-col gap-1 pt-0.5">
        <p className="text-2xl lg:text-[26px] font-black text-slate-900 tracking-tight leading-none">
          {value}
        </p>
        {subtext && (
          <p className="text-[11px] font-medium text-slate-500 leading-normal mt-0.5">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

const PageSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-live="polite">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-9 w-9 rounded-xl" />
          </div>
          <SkeletonBlock className="mt-4 h-8 w-20" />
          <SkeletonBlock className="mt-3 h-2.5 w-32" />
        </div>
      ))}
    </div>
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-3">
        <SkeletonBlock className="h-10 flex-1 min-w-[240px]" />
        <SkeletonBlock className="h-10 w-36" />
        <SkeletonBlock className="h-10 w-36" />
        <SkeletonBlock className="h-10 w-32" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <SkeletonBlock className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <SkeletonBlock className="h-2.5 w-24" />
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-2.5 w-20" />
            <SkeletonBlock className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Inventory = () => {
  const [activeTab, setActiveTab] = useState("catalogue");

  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [stockModalMode, setStockModalMode] = useState(null);
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [nextOverview, nextProducts, nextCategories, nextSuppliers, nextMovements, nextBatches] =
        await Promise.all([
          getInventoryOverview(),
          listProducts(),
          listCategories(),
          listSuppliers(),
          listStockMovements(null, 150),
          listBatches(),
        ]);

      setOverview(nextOverview);
      setProducts(nextProducts || []);
      setCategories(nextCategories || []);
      setSuppliers(nextSuppliers || []);
      setMovements(nextMovements || []);
      setBatches(nextBatches || []);
    } catch (error) {
      console.error("GymDeck: failed to load inventory module data:", error);
      setLoadError(error?.message || "Inventory data could not be loaded from the local vault.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const metrics = useMemo(() => {
    const activeProducts = products.filter((product) => product.status !== "ARCHIVED");
    let units = 0;
    let low = 0;
    let out = 0;
    let valuation = 0;

    activeProducts.forEach((product) => {
      const quantity = Number(product.available_quantity) || 0;
      units += quantity;
      valuation += quantity * (Number(product.cost_price_minor_units) || 0);
      if (quantity <= 0) out += 1;
      else if (quantity <= (Number(product.low_stock_threshold) || 5)) low += 1;
    });

    return {
      totalProducts: activeProducts.length,
      totalUnits: units,
      lowStock: low,
      outOfStock: out,
      valuation,
    };
  }, [products]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setEditorOpen(true);
    setDetailProduct(null);
  };

  const handleOpenStockOp = (mode, product = null) => {
    setStockModalMode(mode);
    setStockModalProduct(product);
  };

  const handleArchiveToggle = async (product) => {
    setActionError("");
    try {
      if (product.status === "ARCHIVED") await unarchiveProduct(product.id);
      else await archiveProduct(product.id);
      setDetailProduct(null);
      await loadAll();
    } catch (error) {
      setActionError(error?.message || "The archive operation could not be completed.");
    }
  };

  const handleExportCsv = (kind = "products") => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = "gymdeck_inventory.csv";

    if (kind === "movements") {
      filename = "gymdeck_stock_movements.csv";
      csvContent += "Date,Product,Movement Type,Change,Balance After,Reference,Reason\n";
      movements.forEach((movement) => {
        csvContent += `"${movement.created_at}","${movement.product_name || ""}","${movement.movement_type}",${movement.quantity_change},${movement.quantity_after},"${movement.reference_id || ""}","${movement.reason || ""}"\n`;
      });
    } else if (kind === "batches") {
      filename = "gymdeck_inventory_batches.csv";
      csvContent += "Batch Number,Product,Supplier,Expiry Date,Available Quantity\n";
      batches.forEach((batch) => {
        csvContent += `"${batch.batch_number}","${batch.product_name || ""}","${batch.supplier_name || ""}","${batch.expires_at || ""}",${batch.available_quantity}\n`;
      });
    } else {
      csvContent += "Product Name,Brand,Category,SKU,Barcode,Selling Price,Cost Price,Available Stock,Status\n";
      products.forEach((product) => {
        csvContent += `"${product.name}","${product.brand || ""}","${product.category_name || ""}","${product.sku || ""}","${product.barcode || ""}",${(product.selling_price_minor_units || 0) / 100},${(product.cost_price_minor_units || 0) / 100},${product.available_quantity || 0},"${product.status}"\n`;
      });
    }

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManageAction = (action) => {
    if (action === "export-products") handleExportCsv("products");
    else if (action === "export-movements") handleExportCsv("movements");
  };

  const manageItems = [
    { value: "export-products", label: "Export products", description: "Download catalogue as CSV", icon: FileSpreadsheet },
    { value: "export-movements", label: "Export stock ledger", description: "Download movements as CSV", icon: History },
  ];

  const catalogueCount = products.filter((product) => product.status !== "ARCHIVED").length;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans select-none pb-16">
      
      {/* ─────────────────────────────────────────────────────────────────────────
          MAIN CONTENT CONTAINER & STATS (MATCHING CCTV/LIVE & RECORDINGS)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Top Header: Tab Navigation (Top-Left) & Add Product (Top-Right) */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Top-Left: Tabs (Product Catalogue & Stock Ledger) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-xs flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("catalogue")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "catalogue"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <Package size={15} />
              <span>Product Catalogue ({catalogueCount})</span>
            </button>

            <button
              onClick={() => setActiveTab("ledger")}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "ledger"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <History size={15} />
              <span>Stock Ledger &amp; Batches</span>
              {movements.length > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    activeTab === "ledger" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {movements.length}
                </span>
              )}
            </button>
          </div>

          {/* Top-Right: Add Product Primary CTA */}
          <button
            onClick={handleOpenAdd}
            style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}
            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={17} strokeWidth={2.8} className="text-white" />
            <span>Add Product</span>
          </button>
        </div>

        {/* Dynamic Executive KPI Stat Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatTile
            label="Catalogue Items"
            value={formatCount(metrics.totalProducts)}
            subtext={`${formatUnits(metrics.totalUnits)} total units in stock`}
            tone="indigo"
            icon={Package}
          />
          <StatTile
            label="Inventory Valuation"
            value={formatINR(overview?.valuation_minor_units ?? metrics.valuation)}
            subtext="Purchase cost basis valuation"
            tone="blue"
            icon={IndianRupee}
          />
          <StatTile
            label="Stock Health"
            value={
              metrics.outOfStock > 0
                ? `${metrics.outOfStock} Out of Stock`
                : metrics.lowStock > 0
                ? `${metrics.lowStock} Low Stock`
                : "Healthy & Synced"
            }
            subtext={
              metrics.outOfStock > 0
                ? `${metrics.lowStock} items also below threshold`
                : "All items above restock limits"
            }
            tone={metrics.outOfStock > 0 ? "rose" : metrics.lowStock > 0 ? "amber" : "emerald"}
            icon={metrics.outOfStock > 0 ? AlertTriangle : ShieldCheck}
          />
          <StatTile
            label="Vendors & Vault"
            value={`${suppliers.length} Suppliers`}
            subtext={`${categories.length} item categories configured`}
            tone="slate"
            icon={Users}
          />
        </div>

        {/* Operational Toolbar: Categories, Suppliers, Adjust Stock, Receive Stock, Export & Sync */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          {/* Left Actions: Management & Auditing Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 transition-all shadow-2xs cursor-pointer"
              title="Manage product categories"
            >
              <FolderTree size={14} className="text-indigo-600" />
              <span>Product Categories</span>
            </button>

            <button
              onClick={() => setSupplierModalOpen(true)}
              className="h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 transition-all shadow-2xs cursor-pointer"
              title="Manage suppliers and vendor contacts"
            >
              <Users size={14} className="text-blue-600" />
              <span>Suppliers</span>
            </button>

            <button
              onClick={() => handleOpenStockOp("adjust")}
              className="h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 transition-all shadow-2xs cursor-pointer"
              title="Audit corrections and stock write-offs"
            >
              <Sliders size={14} className="text-amber-600" />
              <span>Adjust Stock</span>
            </button>
          </div>

          {/* Right Actions: Receive Stock, Export CSV & Vault Sync */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => handleOpenStockOp("receive")}
              className="h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-2 text-slate-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 text-emerald-800 transition-all shadow-2xs cursor-pointer"
              title="Record incoming stock delivery"
            >
              <Truck size={15} strokeWidth={2.4} className="text-emerald-600" />
              <span>Receive Stock</span>
            </button>

            <Dropdown
              value=""
              onChange={handleManageAction}
              options={manageItems}
              placeholder="Export"
              size="md"
              ariaLabel="Export inventory reports"
              menuMinWidth={200}
              className="w-[105px] text-xs font-bold border-slate-200/90 text-slate-700"
            />

            <button
              onClick={loadAll}
              disabled={loading}
              className="h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh local vault data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : "text-slate-600"} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        {loadError ? (
          <InlineAlert
            title="Vault connection error"
            action={
              <Button size="sm" variant="secondary" onClick={loadAll} disabled={loading}>
                Retry
              </Button>
            }
          >
            {loadError}
          </InlineAlert>
        ) : null}

        {actionError ? (
          <InlineAlert
            title="Operation failed"
            action={
              <IconButton
                label="Dismiss error"
                icon={() => <span aria-hidden="true">×</span>}
                onClick={() => setActionError("")}
              />
            }
          >
            {actionError}
          </InlineAlert>
        ) : null}

        {/* Content Area */}
        {loading && !overview && products.length === 0 ? (
          <PageSkeleton />
        ) : activeTab === "catalogue" ? (
          products.length === 0 ? (
            /* EMPTY STATE: COMPACT WIDE TECHNICAL DROPZONE (EXACT CCTV/LIVE & RECORDINGS DESIGN) */
            <div className="relative rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-400/80 bg-slate-50/60 p-5 sm:p-7 lg:p-7 w-full mx-auto transition-colors overflow-hidden">
              {/* Subtle technical background grid dots */}
              <div
                className="absolute inset-0 opacity-[0.45] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              <div className="relative z-10 flex flex-col gap-5">
                {/* Top Bar: Status Chip & Protocol Compatibility Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-dashed border-slate-200/90">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-slate-200 shadow-2xs text-[11px] font-bold text-slate-600 tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Inventory Retail Engine Ready</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-mono text-[10px]">Awaiting First Product</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Radio size={13} className="text-indigo-600" /> Multi-Variant &amp; Barcode SKUs
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Lock size={13} className="text-emerald-600" /> FIFO &amp; Batch Shelf-Life Auditing
                    </span>
                  </div>
                </div>

                {/* Main Grid: Left Onboarding Content + Right Capability Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left Section: Product Icon, Headline, Description & CTAs */}
                  <div className="lg:col-span-7 flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                    {/* Icon */}
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-indigo-200 bg-white shadow-xs flex items-center justify-center text-indigo-600">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center">
                          <Package size={24} strokeWidth={2.2} className="text-indigo-600" />
                        </div>
                      </div>
                      <div
                        style={{ backgroundColor: "#4f46e5" }}
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white border-2 border-white flex items-center justify-center shadow-xs"
                      >
                        <Plus size={12} strokeWidth={3} />
                      </div>
                    </div>

                    {/* Content & Action Buttons */}
                    <div className="space-y-3 flex-1">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          No Products in Catalogue
                        </h3>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 leading-relaxed mt-1">
                          Track gym merchandise, protein supplements, branded gear, equipment accessories and beverages with real-time stock deductions and restock thresholds.
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          onClick={handleOpenAdd}
                          style={{ backgroundColor: "#4f46e5", color: "#ffffff" }}
                          className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Plus size={15} strokeWidth={2.8} className="text-white" />
                          <span>Add Product</span>
                        </button>

                        <button
                          onClick={() => setCategoryModalOpen(true)}
                          className="h-10 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-300 transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                          <FolderTree size={15} className="text-indigo-600" />
                          <span>Configure Categories</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Compact 3 Micro-Specs Cards */}
                  <div className="lg:col-span-5 flex flex-col gap-2.5">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/70">
                        <Zap size={15} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">Point-of-Sale Integration</div>
                        <div className="text-[11px] text-slate-400 font-medium truncate">Instant retail billing &amp; automated ledger deduction</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/70">
                        <ShieldCheck size={15} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">Batch &amp; Expiry Surveillance</div>
                        <div className="text-[11px] text-slate-400 font-medium truncate">30-day early expiry alerts &amp; FEFO rotation</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/70">
                        <Server size={15} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">Offline Vault Mirroring</div>
                        <div className="text-[11px] text-slate-400 font-medium truncate">Local SQLite persistence with cloud backup sync</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ProductCatalogueView
              products={products}
              categories={categories}
              onSelectProduct={(product) => setDetailProduct(product)}
              onEditProduct={handleOpenEdit}
              onReceiveStock={(product) => handleOpenStockOp("receive", product)}
              onAdjustStock={(product) => handleOpenStockOp("adjust", product)}
              onAddProduct={handleOpenAdd}
            />
          )
        ) : (
          <StockLedgerView
            movements={movements}
            batches={batches}
            onExportCsv={handleExportCsv}
          />
        )}
      </div>

      {/* Drawers and modals are conditionally rendered so each open starts from a clean state. */}
      {editorOpen ? (
        <ProductEditorDrawer
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          onSaved={loadAll}
        />
      ) : null}

      {detailProduct ? (
        <ProductDetailDrawer
          isOpen={Boolean(detailProduct)}
          onClose={() => setDetailProduct(null)}
          product={detailProduct}
          onEdit={handleOpenEdit}
          onReceiveStock={(product) => handleOpenStockOp("receive", product)}
          onAdjustStock={(product) => handleOpenStockOp("adjust", product)}
          onArchiveToggle={handleArchiveToggle}
        />
      ) : null}

      {stockModalMode ? (
        <StockOperationsModal
          isOpen
          mode={stockModalMode}
          onClose={() => {
            setStockModalMode(null);
            setStockModalProduct(null);
          }}
          products={products}
          suppliers={suppliers}
          selectedProduct={stockModalProduct}
          onSuccess={loadAll}
        />
      ) : null}

      {categoryModalOpen ? (
        <CategoryManagerModal
          isOpen={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
          categories={categories}
          onUpdated={loadAll}
        />
      ) : null}

      {supplierModalOpen ? (
        <SupplierManagerModal
          isOpen={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          suppliers={suppliers}
          onUpdated={loadAll}
        />
      ) : null}
    </div>
  );
};

export const mountInventory = (targetElement) => {
  const container = targetElement || document.querySelector('[data-stage="inventory"]');
  if (!container) {
    console.error("GymDeck: Inventory container not found!");
    return null;
  }

  try {
    const root = createRoot(container);
    root.render(
      <ErrorBoundary>
        <Inventory />
        <BrandFooter />
      </ErrorBoundary>
    );
    return root;
  } catch (error) {
    console.error("GymDeck: Critical mount failure in Inventory:", error);
    return null;
  }
};

export default Inventory;
