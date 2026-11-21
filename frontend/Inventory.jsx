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
} from "lucide-react";
import BrandFooter from "./BrandFooter.jsx";
import { formatINR, formatCount } from "./inventory/InventoryShared.jsx";
import {
  Badge,
  Button,
  Dropdown,
  EmptyState,
  IconButton,
  InlineAlert,
  SkeletonBlock,
  StatCard,
  Tabs,
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

const InventoryPageShell = ({ children }) => (
  <div className="min-h-full bg-[#f6f7fb] pb-10 font-sans text-slate-900 antialiased">{children}</div>
);

const PageSkeleton = () => (
  <div className="space-y-5" aria-busy="true" aria-live="polite">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-2.5 w-20" />
            <SkeletonBlock className="h-7 w-7" />
          </div>
          <SkeletonBlock className="mt-4 h-6 w-16" />
          <SkeletonBlock className="mt-3 h-2 w-28" />
        </div>
      ))}
    </div>
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <SkeletonBlock className="h-9 flex-1 min-w-[220px]" />
        <SkeletonBlock className="h-9 w-32" />
        <SkeletonBlock className="h-9 w-32" />
        <SkeletonBlock className="h-9 w-28" />
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <SkeletonBlock className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2.5 p-4">
            <SkeletonBlock className="h-2 w-24" />
            <SkeletonBlock className="h-3.5 w-4/5" />
            <SkeletonBlock className="h-2 w-20" />
            <SkeletonBlock className="h-7 w-full" />
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
    if (action === "categories") setCategoryModalOpen(true);
    else if (action === "suppliers") setSupplierModalOpen(true);
    else if (action === "adjust") handleOpenStockOp("adjust");
    else if (action === "export-products") handleExportCsv("products");
    else if (action === "export-movements") handleExportCsv("movements");
  };

  const manageItems = [
    { value: "categories", label: "Product categories", description: "Group and label catalogue items", icon: FolderTree },
    { value: "suppliers", label: "Suppliers", description: "Vendor and purchase contacts", icon: Users },
    { value: "adjust", label: "Adjust stock", description: "Audit corrections and write-offs", icon: Sliders },
    { value: "export-products", label: "Export products", description: "Download catalogue as CSV", icon: FileSpreadsheet },
    { value: "export-movements", label: "Export stock ledger", description: "Download movements as CSV", icon: History },
  ];

  const catalogueCount = products.filter((product) => product.status !== "ARCHIVED").length;

  return (
    <InventoryPageShell>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4 py-4 lg:py-5">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white shadow-sm">
                <Package size={21} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-slate-900">
                    Inventory
                  </h1>
                  <Badge tone="orange">Retail &amp; stock</Badge>
                  {!loading && loadError ? <Badge tone="rose" dot>Offline</Badge> : null}
                </div>
                <p className="mt-1 max-w-2xl text-[12.5px] leading-5 text-slate-500">
                  Catalogue, pricing, suppliers and stock movement — managed from this gym&apos;s local vault.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <IconButton
                label="Refresh inventory"
                icon={RefreshCw}
                onClick={loadAll}
                disabled={loading}
                className={loading ? "[&>svg]:animate-spin" : ""}
              />
              <Dropdown
                value=""
                onChange={handleManageAction}
                options={manageItems}
                placeholder="Manage"
                size="lg"
                ariaLabel="Manage inventory"
                menuMinWidth={260}
                className="w-[124px] border-slate-200 font-bold"
              />
              <Button
                variant="secondary"
                size="lg"
                leftIcon={Truck}
                onClick={() => handleOpenStockOp("receive")}
              >
                Receive stock
              </Button>
              <Button variant="primary" size="lg" leftIcon={Plus} onClick={handleOpenAdd}>
                Add product
              </Button>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-slate-100">
            <Tabs
              ariaLabel="Inventory sections"
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { key: "catalogue", label: "Product catalogue", count: catalogueCount, icon: Package },
                { key: "ledger", label: "Stock ledger", count: movements.length, icon: History },
              ]}
            />
            <p className="hidden pb-3 text-[11px] font-medium text-slate-400 md:block">
              {loading ? "Syncing local vault…" : `${formatCount(suppliers.length)} suppliers · ${formatCount(categories.length)} categories`}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] space-y-5 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-6">
        {loadError ? (
          <InlineAlert
            title="Inventory could not be loaded"
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
            title="Action failed"
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

        {loading && !overview && products.length === 0 ? (
          <PageSkeleton />
        ) : (
          <>
            <section aria-label="Inventory summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard
                label="Total products"
                value={formatCount(metrics.totalProducts)}
                hint="Active catalogue items"
                icon={Package}
                tone="orange"
              />
              <StatCard
                label="Units in stock"
                value={formatCount(metrics.totalUnits)}
                hint="Across all active products"
                icon={Boxes}
                tone="emerald"
              />
              <StatCard
                label="Low stock"
                value={formatCount(metrics.lowStock)}
                hint="At or below alert threshold"
                icon={AlertTriangle}
                tone="amber"
                badge={metrics.lowStock > 0 ? "Review" : undefined}
              />
              <StatCard
                label="Out of stock"
                value={formatCount(metrics.outOfStock)}
                hint="No units available"
                icon={AlertTriangle}
                tone="rose"
                badge={metrics.outOfStock > 0 ? "Restock" : undefined}
              />
              <StatCard
                label="Stock valuation"
                value={formatINR(overview?.valuation_minor_units ?? metrics.valuation)}
                hint="Purchase cost basis"
                icon={IndianRupee}
                tone="slate"
              />
            </section>

            <section aria-label="Inventory workspace">
              {activeTab === "catalogue" ? (
                products.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Your catalogue is empty"
                    description="Add your first product to start tracking gym merchandise, supplements, equipment and retail stock."
                    action={
                      <Button variant="primary" size="lg" leftIcon={Plus} onClick={handleOpenAdd}>
                        Add your first product
                      </Button>
                    }
                  />
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
            </section>
          </>
        )}
      </main>

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
    </InventoryPageShell>
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
  } catch (error) {
    console.error("GymDeck: Critical mount failure in Inventory:", error);
    return null;
  }
};

export default Inventory;
