import React, { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  History,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Clock,
} from "lucide-react";
import { formatINR, formatUnits } from "./InventoryShared.jsx";

export const StockLedgerView = ({ movements = [], batches = [], onExportCsv }) => {
  const [activeTab, setActiveTab] = useState("movements"); // "movements" | "batches"
  const [filterType, setFilterType] = useState("ALL");

  const filteredMovements = movements.filter((m) => {
    if (filterType !== "ALL" && m.movement_type !== filterType) {
      return false;
    }
    return true;
  });

  const getMovementTone = (mvt) => {
    if (mvt.movement_type === "PURCHASE" || mvt.movement_type === "OPENING" || mvt.movement_type === "ADJUSTMENT_ADD") {
      return {
        icon: ArrowUpRight,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        badge: "text-emerald-700 bg-emerald-100/60",
      };
    }
    return {
      icon: ArrowDownRight,
      color: "text-rose-600 bg-rose-50 border-rose-200",
      badge: "text-rose-700 bg-rose-100/60",
    };
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("movements")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "movements"
                ? "bg-orange-500 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Stock Movement Ledger ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "batches"
                ? "bg-orange-500 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Batches & Expiry Dates ({batches.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "movements" ? (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-orange-500"
            >
              <option value="ALL">All Movement Types</option>
              <option value="PURCHASE">Purchases / Goods In</option>
              <option value="OPENING">Opening Stock</option>
              <option value="ADJUSTMENT_ADD">Manual Additions (+)</option>
              <option value="ADJUSTMENT_SUB">Manual Deductions (-)</option>
              <option value="DAMAGE">Damaged Goods</option>
              <option value="EXPIRY">Expired Write-offs</option>
              <option value="LOSS">Lost / Missing</option>
              <option value="INTERNAL_USE">Internal Consumption</option>
            </select>
          ) : null}

          {onExportCsv ? (
            <button
              onClick={() => onExportCsv(activeTab)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-300 shadow-2xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Export CSV
            </button>
          ) : null}
        </div>
      </div>

      {/* Movements Table */}
      {activeTab === "movements" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product / Item</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4 text-right">Change</th>
                <th className="py-3 px-4 text-right">New Balance</th>
                <th className="py-3 px-4">Reference / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const tone = getMovementTone(m);
                  const Icon = tone.icon;
                  const dateStr = new Date(m.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{m.product_name || "Gym Product"}</p>
                        {m.variant_name ? (
                          <p className="text-[10px] font-semibold text-slate-500">{m.variant_name}</p>
                        ) : null}
                        {m.batch_number ? (
                          <p className="text-[10px] font-mono text-slate-400">Batch: {m.batch_number}</p>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${tone.badge}`}
                        >
                          <Icon className="h-3 w-3" /> {m.movement_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-600">
                        {m.quantity_after}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {m.reference_id ? (
                          <span className="font-mono font-semibold text-slate-700">
                            Ref: {m.reference_id}{" "}
                          </span>
                        ) : null}
                        <span>{m.reason || "—"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Batches Table */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-right">Available Qty</th>
                <th className="py-3 px-4 text-center">Batch Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-slate-400">
                    No batches recorded. Receive stock with batch numbers to populate tracking.
                  </td>
                </tr>
              ) : (
                batches.map((b) => {
                  const now = new Date();
                  const expDate = b.expires_at ? new Date(b.expires_at) : null;
                  const isExpired = expDate && expDate < now;
                  const isExpiringSoon =
                    expDate && !isExpired && expDate - now < 30 * 24 * 60 * 60 * 1000;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.batch_number}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{b.product_name}</td>
                      <td className="py-3 px-4 text-slate-600">{b.supplier_name || "Direct"}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {b.expires_at ? new Date(b.expires_at).toLocaleDateString("en-IN") : "No date"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        {b.available_quantity}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isExpired ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 animate-pulse">
                            Expiring Soon
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Valid Batch
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
