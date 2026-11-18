import BrandFooter from "./BrandFooter.jsx";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  IndianRupee,
  Minus,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";

// Inventory workspace. Records are held per gym in local storage until an
// inventory command exists in the native layer; the `inventory` table in
// src-tauri/src/database/schema.sql is the eventual home for these rows.

const STORAGE_PREFIX = "gymdeck_inventory_items";

const getStorageKey = () => {
  const gymCode =
    (typeof localStorage !== "undefined" && (localStorage.getItem("gymdeck_gym_code") || localStorage.getItem("gymdeck_gym_name"))) ||
    "default";
  return `${STORAGE_PREFIX}:${String(gymCode).trim().toLowerCase()}`;
};

const CATEGORIES = ["Supplements", "Apparel", "Equipment", "Consumables", "Accessories", "Other"];

const emptyDraft = () => ({
  name: "",
  category: "Supplements",
  supplier: "",
  quantity: "0",
  reorderLevel: "5",
  unitPrice: "",
});

const readItems = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(getStorageKey()) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.name === "string");
  } catch {
    return [];
  }
};

const writeItems = (items) => {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(items));
  } catch (err) {
    console.warn("GymDeck: could not persist inventory locally", err);
  }
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const stockState = (item) => {
  const quantity = Number(item.quantity) || 0;
  const reorderLevel = Number(item.reorderLevel) || 0;
  if (quantity <= 0) return { id: "out", label: "Out of stock", tone: "bg-rose-50 text-rose-600 border-rose-100" };
  if (quantity <= reorderLevel) return { id: "low", label: "Low stock", tone: "bg-amber-50 text-amber-600 border-amber-100" };
  return { id: "ok", label: "In stock", tone: "bg-emerald-50 text-emerald-600 border-emerald-100" };
};

const StatCard = ({ label, value, hint, tone }) => (
  <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className={`mt-2 text-2xl font-black leading-none tracking-tight ${tone || "text-slate-900"}`}>{value}</p>
    <p className="mt-2 text-[11px] font-medium leading-snug text-slate-500">{hint}</p>
  </article>
);

const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
    <div className="mt-1.5">{children}</div>
    {hint ? <p className="mt-1 text-[10px] font-medium text-slate-400">{hint}</p> : null}
  </label>
);

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

const ItemDrawer = ({ draft, onClose, onSave, onDelete, isEditing }) => {
  const [form, setForm] = useState(draft);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(draft);
    setError("");
  }, [draft]);

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Item name is required.");
      return;
    }
    const quantity = Math.max(0, Math.trunc(Number(form.quantity) || 0));
    const reorderLevel = Math.max(0, Math.trunc(Number(form.reorderLevel) || 0));
    const unitPrice = Math.max(0, Number(form.unitPrice) || 0);
    onSave({
      name,
      category: form.category,
      supplier: form.supplier.trim(),
      quantity,
      reorderLevel,
      unitPrice,
    });
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-stretch justify-end bg-slate-900/40 backdrop-blur-[2px]">
      <form
        onSubmit={submit}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit inventory item" : "Add inventory item"}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">{isEditing ? "Edit item" : "New item"}</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">{isEditing ? "Update stock record" : "Add to inventory"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 space-y-4 px-5 py-5">
          <Field label="Item name">
            <input
              type="text"
              value={form.name}
              onChange={update("name")}
              placeholder="Whey Protein 1kg"
              className={inputClass}
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={update("category")} className={inputClass}>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Supplier">
              <input
                type="text"
                value={form.supplier}
                onChange={update("supplier")}
                placeholder="Muscle Depot"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Quantity">
              <input type="number" min="0" step="1" value={form.quantity} onChange={update("quantity")} className={inputClass} />
            </Field>
            <Field label="Reorder at" hint="Low-stock alert">
              <input type="number" min="0" step="1" value={form.reorderLevel} onChange={update("reorderLevel")} className={inputClass} />
            </Field>
            <Field label="Unit price">
              <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={update("unitPrice")} placeholder="0" className={inputClass} />
            </Field>
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">{error}</p>
          ) : null}
        </div>

        <footer className="flex items-center gap-2 border-t border-slate-100 px-5 py-4">
          {isEditing ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 text-[10px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-100"
            >
              <Trash2 size={13} />
              Delete
            </button>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 rounded-xl bg-slate-900 px-4 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slate-800"
            >
              {isEditing ? "Save changes" : "Add item"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
};

const Inventory = () => {
  const [items, setItems] = useState(() => readItems());
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [drawer, setDrawer] = useState(null);

  useEffect(() => {
    writeItems(items);
  }, [items]);

  const query = searchQuery.trim().toLowerCase();

  const stats = useMemo(() => {
    const units = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const value = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
    const low = items.filter((item) => stockState(item).id === "low").length;
    const out = items.filter((item) => stockState(item).id === "out").length;
    return { units, value, low, out };
  }, [items]);

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        const state = stockState(item).id;
        if (filter === "low" && state !== "low") return false;
        if (filter === "out" && state !== "out") return false;
        if (!query) return true;
        return [item.name, item.sku, item.category, item.supplier]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0) || a.name.localeCompare(b.name));
  }, [items, filter, query]);

  const adjustQuantity = (id, delta) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, (Number(item.quantity) || 0) + delta), updatedAt: new Date().toISOString() } : item
      )
    );
  };

  const saveItem = (values) => {
    if (drawer && drawer.item) {
      setItems((prev) =>
        prev.map((item) => (item.id === drawer.item.id ? { ...item, ...values, updatedAt: new Date().toISOString() } : item))
      );
    } else {
      const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev, { id, sku: "", ...values, updatedAt: new Date().toISOString() }]);
    }
    setDrawer(null);
  };

  const deleteItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDrawer(null);
  };

  const filters = [
    { id: "all", label: "All items", count: items.length },
    { id: "low", label: "Low stock", count: stats.low },
    { id: "out", label: "Out of stock", count: stats.out },
  ];

  return (
    <div className="inventory-shell font-sans text-slate-900 selection:bg-indigo-100">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span>Settings</span>
          <ChevronRight size={14} className="text-slate-300" />
          <span className="font-bold text-slate-900">Inventory</span>
        </nav>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-80">
            <span className="sr-only">Search inventory</span>
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search item, category or supplier"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <button
            type="button"
            onClick={() => setDrawer({ item: null })}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-slate-800"
          >
            <PackagePlus size={14} />
            Add item
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black leading-none tracking-tight text-slate-900">Inventory</h1>
          <p className="mt-2 max-w-2xl text-xs font-semibold leading-relaxed text-slate-500">
            Track supplements, apparel, equipment and consumables — stock on hand, reorder levels and the value locked up on your shelves.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <Boxes size={12} className="text-indigo-500" />
          {items.length} {items.length === 1 ? "item" : "items"} tracked
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Items tracked" value={items.length} hint="Distinct stock records" />
        <StatCard label="Units on hand" value={stats.units} hint="Total quantity across all items" />
        <StatCard label="Stock value" value={formatCurrency(stats.value)} hint="Quantity × unit price" />
        <StatCard
          label="Needs attention"
          value={stats.low + stats.out}
          tone={stats.low + stats.out > 0 ? "text-amber-600" : "text-emerald-600"}
          hint={`${stats.low} low · ${stats.out} out of stock`}
        />
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Stock filter">
            {filters.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  filter === option.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {option.label}
                <span className={`rounded px-1.5 py-0.5 text-[9px] ${filter === option.id ? "bg-white/15" : "bg-slate-100 text-slate-500"}`}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {filtered.length} of {items.length} shown
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Package size={20} />
            </span>
            {items.length === 0 ? (
              <>
                <p className="mt-4 text-sm font-bold text-slate-800">No inventory yet</p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Add your first item to start tracking stock levels, suppliers and reorder alerts.
                </p>
                <button
                  type="button"
                  onClick={() => setDrawer({ item: null })}
                  className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slate-800"
                >
                  <Plus size={14} />
                  Add item
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm font-bold text-slate-800">
                  {query ? `No items match “${searchQuery}”` : "Nothing in this filter"}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {query ? "Try an item name, category or supplier." : "Switch the filter to see the rest of your stock."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                  }}
                  className="mt-4 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <th className="px-5 py-3">Item</th>
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3">Supplier</th>
                  <th className="px-3 py-3 text-right">Unit price</th>
                  <th className="px-3 py-3 text-center">Stock</th>
                  <th className="px-3 py-3 text-right">Value</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const state = stockState(item);
                  const quantity = Number(item.quantity) || 0;
                  const unitPrice = Number(item.unitPrice) || 0;
                  return (
                    <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <p className="text-xs font-bold text-slate-900">{item.name}</p>
                        <span className={`mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${state.tone}`}>
                          {state.id !== "ok" ? <AlertTriangle size={9} /> : null}
                          {state.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-600">{item.category || "—"}</td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Truck size={12} className="text-slate-300" />
                          {item.supplier || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-semibold text-slate-600">
                        {unitPrice > 0 ? formatCurrency(unitPrice) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustQuantity(item.id, -1)}
                            disabled={quantity <= 0}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-white disabled:opacity-40"
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-10 text-center text-xs font-black tabular-nums text-slate-900">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => adjustQuantity(item.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-white"
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <p className="mt-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          Reorder at {Number(item.reorderLevel) || 0}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-bold tabular-nums text-slate-800">
                        <span className="inline-flex items-center gap-0.5">
                          <IndianRupee size={11} className="text-slate-300" />
                          {(quantity * unitPrice).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDrawer({ item })}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-white"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3 text-[10px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            In stock
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            At or below reorder level
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Out of stock
          </span>
          <span className="ml-auto text-slate-400">Saved on this device</span>
        </div>
      </section>

      {drawer ? (
        <ItemDrawer
          draft={
            drawer.item
              ? {
                  name: drawer.item.name || "",
                  category: drawer.item.category || "Other",
                  supplier: drawer.item.supplier || "",
                  quantity: String(drawer.item.quantity ?? 0),
                  reorderLevel: String(drawer.item.reorderLevel ?? 5),
                  unitPrice: drawer.item.unitPrice != null ? String(drawer.item.unitPrice) : "",
                }
              : emptyDraft()
          }
          isEditing={Boolean(drawer.item)}
          onClose={() => setDrawer(null)}
          onSave={saveItem}
          onDelete={() => deleteItem(drawer.item.id)}
        />
      ) : null}
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
    root.render(<><Inventory /><BrandFooter /></>);
    return root;
  } catch (err) {
    console.error("GymDeck: Critical mount failure in Inventory:", err);
    return null;
  }
};

export default Inventory;
