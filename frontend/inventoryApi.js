/**
 * GymDeck Inventory Client API
 * 
 * Provides unified, typed access to the backend SQLite inventory repository
 * via Tauri native commands, with a resilient local mirror for web preview.
 */

const isTauri = () => typeof window !== "undefined" && Boolean(window.__TAURI__?.core?.invoke);

const BROWSER_STORE_PREFIX = "gymdeck_inventory_preview";
const getStorageKey = () => {
  const gymCode =
    (typeof localStorage !== "undefined" &&
      (localStorage.getItem("gymdeck_gym_code") || localStorage.getItem("gymdeck_gym_name"))) ||
    "default";
  return `${BROWSER_STORE_PREFIX}:${String(gymCode).trim().toLowerCase()}`;
};

// Fallback in-browser mock state for development without native Tauri build
const readBrowserStore = () => {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : { products: [], categories: [], suppliers: [], movements: [] };
  } catch {
    return { products: [], categories: [], suppliers: [], movements: [] };
  }
};

const writeBrowserStore = (data) => {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
  } catch (e) {
    console.warn("GymDeck: Browser inventory mirror save failed", e);
  }
};

async function invokeCommand(command, args = {}) {
  if (isTauri()) {
    const res = await window.__TAURI__.core.invoke(command, args);
    if (res && res.success === false) {
      throw new Error(res.error || "Inventory operation failed.");
    }
    return res?.data ?? res;
  }
  return null;
}

// In-memory cache for resolved base64 images so we don't re-invoke repeatedly
const imageCache = new Map();

// Convert native file path or storage key to webview-safe URL
export function getProductImageUrl(image) {
  if (!image) return null;
  if (image.dataUrl) return image.dataUrl;
  if (image.storage_key && imageCache.has(image.storage_key)) {
    return imageCache.get(image.storage_key);
  }
  if (image.local_path) {
    if (typeof window !== "undefined" && window.__TAURI__?.core?.convertFileSrc) {
      try {
        const url = window.__TAURI__.core.convertFileSrc(image.local_path);
        if (url) return url;
      } catch (e) {
        console.warn("Failed to convertFileSrc:", e);
      }
    }
    return image.local_path;
  }
  return null;
}

export async function fetchProductImageDataUrl(image) {
  if (!image) return null;
  if (image.dataUrl) return image.dataUrl;
  if (image.storage_key && imageCache.has(image.storage_key)) {
    return imageCache.get(image.storage_key);
  }
  if (isTauri() && image.storage_key) {
    try {
      const dataUrl = await invokeCommand("read_inventory_product_image_data_command", {
        storageKey: image.storage_key,
      });
      if (dataUrl) {
        imageCache.set(image.storage_key, dataUrl);
        return dataUrl;
      }
    } catch (e) {
      console.warn("Failed to read image via Tauri command:", e);
    }
  }
  return getProductImageUrl(image);
}

// ==========================================
// OVERVIEW & METRICS
// ==========================================
export async function getInventoryOverview() {
  if (isTauri()) {
    return await invokeCommand("get_inventory_overview_stats_command");
  }

  const store = readBrowserStore();
  const prods = store.products || [];
  let totalUnits = 0;
  let lowStock = 0;
  let outStock = 0;
  let valuation = 0;

  for (const p of prods) {
    const qty = p.available_quantity || 0;
    totalUnits += qty;
    if (qty <= 0) outStock++;
    else if (qty <= (p.low_stock_threshold || 5)) lowStock++;
    valuation += qty * (p.cost_price_minor_units || 0);
  }

  return {
    total_products: prods.length,
    total_units_in_stock: totalUnits,
    low_stock_count: lowStock,
    out_of_stock_count: outStock,
    expiring_soon_count: 0,
    expired_count: 0,
    valuation_minor_units: valuation,
  };
}

// ==========================================
// CATEGORIES
// ==========================================
export async function listCategories() {
  if (isTauri()) {
    return await invokeCommand("list_inventory_categories_command");
  }
  return readBrowserStore().categories || [];
}

export async function createCategory({ name, description, icon }) {
  if (isTauri()) {
    return await invokeCommand("create_inventory_category_command", { name, description, icon });
  }
  const store = readBrowserStore();
  const newCat = {
    id: `cat_${Date.now()}`,
    name,
    description,
    icon,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  store.categories = [...(store.categories || []), newCat];
  writeBrowserStore(store);
  return newCat;
}

export async function updateCategory({ id, name, description, icon, is_active }) {
  if (isTauri()) {
    return await invokeCommand("update_inventory_category_command", { id, name, description, icon, is_active });
  }
  const store = readBrowserStore();
  store.categories = (store.categories || []).map((c) =>
    c.id === id ? { ...c, name, description, icon, is_active } : c
  );
  writeBrowserStore(store);
  return store.categories.find((c) => c.id === id);
}

// ==========================================
// SUPPLIERS
// ==========================================
export async function listSuppliers() {
  if (isTauri()) {
    return await invokeCommand("list_inventory_suppliers_command");
  }
  return readBrowserStore().suppliers || [];
}

export async function createSupplier(payload) {
  if (isTauri()) {
    return await invokeCommand("create_inventory_supplier_command", {
      supplierName: payload.supplierName,
      contactPerson: payload.contactPerson || null,
      phone: payload.phone || null,
      email: payload.email || null,
      address: payload.address || null,
      gstin: payload.gstin || null,
      notes: payload.notes || null,
    });
  }
  const store = readBrowserStore();
  const newSup = {
    id: `sup_${Date.now()}`,
    ...payload,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  store.suppliers = [...(store.suppliers || []), newSup];
  writeBrowserStore(store);
  return newSup;
}

export async function updateSupplier(id, payload) {
  if (isTauri()) {
    return await invokeCommand("update_inventory_supplier_command", {
      id,
      supplierName: payload.supplierName,
      contactPerson: payload.contactPerson || null,
      phone: payload.phone || null,
      email: payload.email || null,
      address: payload.address || null,
      gstin: payload.gstin || null,
      notes: payload.notes || null,
      is_active: payload.isActive ?? true,
    });
  }
  const store = readBrowserStore();
  store.suppliers = (store.suppliers || []).map((s) => (s.id === id ? { ...s, ...payload } : s));
  writeBrowserStore(store);
  return store.suppliers.find((s) => s.id === id);
}

// ==========================================
// PRODUCTS
// ==========================================
export async function listProducts() {
  if (isTauri()) {
    return await invokeCommand("list_inventory_products_command");
  }
  return readBrowserStore().products || [];
}

export async function getProduct(id) {
  if (isTauri()) {
    return await invokeCommand("get_inventory_product_command", { id });
  }
  return (readBrowserStore().products || []).find((p) => p.id === id) || null;
}

export async function createProduct(payload) {
  if (isTauri()) {
    return await invokeCommand("create_inventory_product_command", { payload });
  }
  const store = readBrowserStore();
  const newProd = {
    id: `prod_${Date.now()}`,
    ...payload,
    available_quantity: payload.initialStock || 0,
    created_at: new Date().toISOString(),
    images: [],
    variants: payload.variants || [],
  };
  store.products = [newProd, ...(store.products || [])];
  writeBrowserStore(store);
  return newProd;
}

export async function updateProduct(id, payload) {
  if (isTauri()) {
    return await invokeCommand("update_inventory_product_command", { id, payload });
  }
  const store = readBrowserStore();
  store.products = (store.products || []).map((p) => (p.id === id ? { ...p, ...payload } : p));
  writeBrowserStore(store);
  return store.products.find((p) => p.id === id);
}

export async function archiveProduct(id) {
  if (isTauri()) {
    return await invokeCommand("archive_inventory_product_command", { id });
  }
  const store = readBrowserStore();
  store.products = (store.products || []).map((p) => (p.id === id ? { ...p, status: "ARCHIVED" } : p));
  writeBrowserStore(store);
  return true;
}

export async function unarchiveProduct(id) {
  if (isTauri()) {
    return await invokeCommand("unarchive_inventory_product_command", { id });
  }
  const store = readBrowserStore();
  store.products = (store.products || []).map((p) => (p.id === id ? { ...p, status: "ACTIVE" } : p));
  writeBrowserStore(store);
  return true;
}

// ==========================================
// IMAGES
// ==========================================
export async function uploadProductImage({ productId, filename, base64Data, isPrimary }) {
  if (isTauri()) {
    return await invokeCommand("upload_inventory_product_image_command", {
      productId,
      filename,
      base64Data,
      isPrimary: Boolean(isPrimary),
    });
  }
  const store = readBrowserStore();
  const img = {
    id: `img_${Date.now()}`,
    productId,
    original_filename: filename,
    dataUrl: base64Data,
    is_primary: Boolean(isPrimary),
    created_at: new Date().toISOString(),
  };
  store.products = (store.products || []).map((p) => {
    if (p.id === productId) {
      const imgs = p.images || [];
      return {
        ...p,
        images: isPrimary ? [img, ...imgs.map((i) => ({ ...i, is_primary: false }))] : [...imgs, img],
        primary_image: isPrimary ? img : p.primary_image || img,
      };
    }
    return p;
  });
  writeBrowserStore(store);
  return img;
}

export async function deleteProductImage(imageId) {
  if (isTauri()) {
    return await invokeCommand("delete_inventory_product_image_command", { imageId });
  }
  return true;
}

export async function setPrimaryProductImage({ imageId, productId }) {
  if (isTauri()) {
    return await invokeCommand("set_primary_inventory_product_image_command", { imageId, productId });
  }
  return true;
}

// ==========================================
// STOCK & MOVEMENTS
// ==========================================
export async function receiveStock(payload) {
  if (isTauri()) {
    return await invokeCommand("receive_inventory_stock_command", { payload });
  }
  const store = readBrowserStore();
  const qty = Number(payload.quantity) || 0;
  store.products = (store.products || []).map((p) => {
    if (p.id === payload.productId) {
      return { ...p, available_quantity: (p.available_quantity || 0) + qty };
    }
    return p;
  });
  const mvt = {
    id: `mvt_${Date.now()}`,
    movement_type: "PURCHASE",
    quantity_change: qty,
    created_at: new Date().toISOString(),
    ...payload,
  };
  store.movements = [mvt, ...(store.movements || [])];
  writeBrowserStore(store);
  return mvt;
}

export async function adjustStock(payload) {
  if (isTauri()) {
    return await invokeCommand("adjust_inventory_stock_command", { payload });
  }
  const store = readBrowserStore();
  const delta = Number(payload.quantityChange) || 0;
  store.products = (store.products || []).map((p) => {
    if (p.id === payload.productId) {
      return { ...p, available_quantity: Math.max(0, (p.available_quantity || 0) + delta) };
    }
    return p;
  });
  const mvt = {
    id: `mvt_${Date.now()}`,
    movement_type: payload.movementType || "ADJUSTMENT_ADD",
    quantity_change: delta,
    created_at: new Date().toISOString(),
    ...payload,
  };
  store.movements = [mvt, ...(store.movements || [])];
  writeBrowserStore(store);
  return mvt;
}

export async function listStockMovements(productId = null, limit = 100) {
  if (isTauri()) {
    return await invokeCommand("list_inventory_stock_movements_command", { productId, limit });
  }
  const store = readBrowserStore();
  const mvts = store.movements || [];
  if (productId) {
    return mvts.filter((m) => m.productId === productId).slice(0, limit);
  }
  return mvts.slice(0, limit);
}

export async function listBatches(productId = null) {
  if (isTauri()) {
    return await invokeCommand("list_inventory_batches_command", { productId });
  }
  return [];
}
