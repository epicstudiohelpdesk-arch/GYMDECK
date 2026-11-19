import React, { useEffect, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Package,
  Plus,
  Truck,
  Sliders,
  FileSpreadsheet,
  FolderTree,
  Users,
  History,
  AlertTriangle,
  Boxes,
  IndianRupee,
  RefreshCw,
  Search,
} from "lucide-react";
import BrandFooter from "./BrandFooter.jsx";
import {
  InventoryStatCard,
  InventoryEmptyState,
  formatINR,
  formatUnits,
} from "./inventory/InventoryShared.jsx";
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

const Inventory = () => {
  // Navigation tabs within Inventory
  const [activeTab, setActiveTab] = useState("catalogue"); // "catalogue" | "ledger"

  // Data State
  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [stockModalMode, setStockModalMode] = useState(null); // null | "receive" | "adjust"
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  // Load all data
  const loadAll = async () => {
    try {
      setLoading(true);
      const [ov, prods, cats, sups, mvts, bts] = await Promise.all([
        getInventoryOverview().catch(() => null),
        listProducts().catch(() => []),
        listCategories().catch(() => []),
        listSuppliers().catch(() => []),
        listStockMovements(null, 150).catch(() => []),
        listBatches().catch(() => []),
      ]);

      setOverview(ov);
      setProducts(prods || []);
      setCategories(cats || []);
      setSuppliers(sups || []);
      setMovements(mvts || []);
      setBatches(bts || []);
    } catch (err) {
      console.error("GymDeck: failed to load inventory module data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Handlers
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setEditorOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setEditorOpen(true);
    setDetailProduct(null);
  };

  const handleOpenStockOp = (mode, prod = null) => {
    setStockModalMode(mode);
    setStockModalProduct(prod);
  };

  const handleArchiveToggle = async (prod) => {
    try {
      if (prod.status === "ARCHIVED") {
        await unarchiveProduct(prod.id);
      } else {
        await archiveProduct(prod.id);
      }
      setDetailProduct(null);
      await loadAll();
    } catch (e) {
      alert(e.message || "Archive operation failed");
    }
  };

  // CSV Export
  const handleExportCsv = (kind = "products") => {
    let csvContent = "data:text/csv;charset=utf-8,";
    let filename = "gymdeck_inventory.csv";

    if (kind === "movements") {
      filename = "gymdeck_stock_movements.csv";
      csvContent += "Date,Product,Movement Type,Change,Balance After,Reference,Reason\n";
      movements.forEach((m) => {
        csvContent += `"${m.created_at}","${m.product_name || ""}","${m.movement_type}",${m.quantity_change},${m.quantity_after},"${m.reference_id || ""}","${m.reason || ""}"\n`;
      });
    } else if (kind === "batches") {
      filename = "gymdeck_inventory_batches.csv";
      csvContent += "Batch Number,Product,Supplier,Expiry Date,Available Quantity\n";
      batches.forEach((b) => {
        csvContent += `"${b.batch_number}","${b.product_name || ""}","${b.supplier_name || ""}","${b.expires_at || ""}",${b.available_quantity}\n`;
      });
    } else {
      // Products
      csvContent += "Product Name,Brand,Category,SKU,Barcode,Selling Price,Cost Price,Available Stock,Status\n";
      products.forEach((p) => {
        csvContent += `"${p.name}","${p.brand || ""}","${p.category_name || ""}","${p.sku || ""}","${p.barcode || ""}",${(p.selling_price_minor_units || 0) / 100},${(p.cost_price_minor_units || 0) / 100},${p.available_quantity || 0},"${p.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 font-sans text-slate-800 antialiased">
      {/* Top Main Navigation / Actions Bar */}
      <div className="border-b border-slate-200/80 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Package className="h-4 w-4 stroke-[2.5]" />
                </span>
                <h1 className="text-xl font-black tracking-tight text-slate-900">Inventory</h1>
              </div>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Manage your gym products, pricing and retail stock balances in one place.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCategoryModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs"
              >
                <FolderTree className="h-3.5 w-3.5 text-slate-500" /> Categories
              </button>

              <button
                onClick={() => setSupplierModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs"
              >
                <Users className="h-3.5 w-3.5 text-slate-500" /> Suppliers
              </button>

              <button
                onClick={() => handleOpenStockOp("receive")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 transition-all shadow-2xs"
              >
                <Truck className="h-3.5 w-3.5 text-emerald-600" /> Receive Stock
              </button>

              <button
                onClick={() => handleOpenStockOp("adjust")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-orange-500 hover:text-orange-700 transition-all shadow-2xs"
              >
                <Sliders className="h-3.5 w-3.5 text-orange-500" /> Adjust Stock
              </button>

              <button
                onClick={() => handleExportCsv("products")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs"
                title="Export product catalog as CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" /> Export
              </button>

              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-4.5 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/25 transition-all hover:shadow-orange-500/35 active:scale-95"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" /> Add Product
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="mt-4 flex gap-6 border-t border-slate-100 pt-3 text-xs font-bold">
            <button
              onClick={() => setActiveTab("catalogue")}
              className={`pb-2 transition-colors relative ${
                activeTab === "catalogue"
                  ? "text-orange-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-orange-500"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Product Catalogue ({products.length})
            </button>
            <button
              onClick={() => setActiveTab("ledger")}
              className={`pb-2 transition-colors relative ${
                activeTab === "ledger"
                  ? "text-orange-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-orange-500"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Stock Ledger & Movements ({movements.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Page Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <InventoryStatCard
            title="Total Products"
            value={overview?.total_products ?? products.length}
            hint="Active gym catalog items"
            icon={Package}
            tone="orange"
          />
          <InventoryStatCard
            title="Units in Stock"
            value={overview?.total_units_in_stock ?? 0}
            hint="Total retail inventory count"
            icon={Boxes}
            tone="emerald"
          />
          <InventoryStatCard
            title="Low Stock"
            value={overview?.low_stock_count ?? 0}
            hint="At or below alert threshold"
            icon={AlertTriangle}
            tone="amber"
          />
          <InventoryStatCard
            title="Out of Stock"
            value={overview?.out_of_stock_count ?? 0}
            hint="0 available units"
            icon={AlertTriangle}
            tone="rose"
          />
          <InventoryStatCard
            title="Valuation"
            value={formatINR(overview?.valuation_minor_units ?? 0)}
            hint="Purchase cost basis"
            icon={IndianRupee}
            tone="slate"
          />
        </div>

        {/* Dynamic Main Body Content */}
        {products.length === 0 && !loading ? (
          <InventoryEmptyState
            title="Your inventory starts here"
            subtitle="Add your first product to manage gym merchandise, supplements, equipment and stock."
            onAction={handleOpenAdd}
            actionLabel="Add Your First Product"
          />
        ) : activeTab === "catalogue" ? (
          <ProductCatalogueView
            products={products}
            categories={categories}
            onSelectProduct={(p) => setDetailProduct(p)}
            onEditProduct={(p) => handleOpenEdit(p)}
            onReceiveStock={(p) => handleOpenStockOp("receive", p)}
            onAdjustStock={(p) => handleOpenStockOp("adjust", p)}
            onAddProduct={handleOpenAdd}
          />
        ) : (
          <StockLedgerView
            movements={movements}
            batches={batches}
            onExportCsv={handleExportCsv}
          />
        )}
      </main>

      {/* Drawers & Modals */}
      <ProductEditorDrawer
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
        onSaved={loadAll}
      />

      <ProductDetailDrawer
        isOpen={Boolean(detailProduct)}
        onClose={() => setDetailProduct(null)}
        product={detailProduct}
        onEdit={(p) => handleOpenEdit(p)}
        onReceiveStock={(p) => handleOpenStockOp("receive", p)}
        onAdjustStock={(p) => handleOpenStockOp("adjust", p)}
        onArchiveToggle={handleArchiveToggle}
      />

      <StockOperationsModal
        isOpen={Boolean(stockModalMode)}
        mode={stockModalMode || "receive"}
        onClose={() => {
          setStockModalMode(null);
          setStockModalProduct(null);
        }}
        products={products}
        suppliers={suppliers}
        selectedProduct={stockModalProduct}
        onSuccess={loadAll}
      />

      <CategoryManagerModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onUpdated={loadAll}
      />

      <SupplierManagerModal
        isOpen={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        suppliers={suppliers}
        onUpdated={loadAll}
      />
    </div>
  );
};

export const mountInventory = () => {
  const container = document.querySelector('[data-stage="inventory"]');
  if (!container) {
    console.error("GymDeck: Inventory container not found!");
    return null;
  }

  try {
    const root = createRoot(container);
    root.render(
      <>
        <Inventory />
        <BrandFooter />
      </>
    );
    return root;
  } catch (err) {
    console.error("GymDeck: Critical mount failure in Inventory:", err);
    return null;
  }
};

export default Inventory;
