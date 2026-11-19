import React from "react";
import { Package, Plus } from "lucide-react";

export const formatINR = (minorUnits) => {
  const val = (Number(minorUnits) || 0) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatUnits = (qty, uom = "pcs") => {
  return `${Number(qty) || 0} ${uom}`;
};

export const getStockBadge = (product) => {
  const qty = Number(product.available_quantity) || 0;
  const threshold = Number(product.low_stock_threshold) || 5;

  if (qty <= 0) {
    return {
      label: "Out of Stock",
      className: "bg-rose-50 text-rose-700 border-rose-200/80 ring-1 ring-rose-500/20",
      dot: "bg-rose-500",
    };
  }
  if (qty <= threshold) {
    return {
      label: "Low Stock",
      className: "bg-amber-50 text-amber-700 border-amber-200/80 ring-1 ring-amber-500/20",
      dot: "bg-amber-500 animate-pulse",
    };
  }
  return {
    label: "In Stock",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/20",
    dot: "bg-emerald-500",
  };
};

export const InventoryStatCard = ({ title, value, hint, icon: Icon, tone = "orange", trend }) => {
  const tones = {
    orange: "text-orange-500 bg-orange-50 border-orange-100",
    emerald: "text-emerald-500 bg-emerald-50 border-emerald-100",
    rose: "text-rose-500 bg-rose-50 border-rose-100",
    amber: "text-amber-500 bg-amber-50 border-amber-100",
    slate: "text-slate-500 bg-slate-50 border-slate-100",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
        {Icon ? (
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${tones[tone] || tones.orange}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black tracking-tight text-slate-900">{value}</span>
        {trend ? (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
            {trend}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p> : null}
    </div>
  );
};

export const InventoryEmptyState = ({ title, subtitle, onAction, actionLabel }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100/70 text-orange-600 shadow-sm">
        <Package className="h-8 w-8 stroke-[1.75]" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-slate-900">{title || "Your inventory starts here"}</h3>
      <p className="mt-1.5 max-w-md text-xs font-medium leading-relaxed text-slate-500">
        {subtitle || "Add your first product to manage gym merchandise, supplements, equipment and stock."}
      </p>
      {onAction ? (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-orange-500/25 transition-all hover:shadow-orange-500/35 active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          {actionLabel || "Add Your First Product"}
        </button>
      ) : null}
    </div>
  );
};
