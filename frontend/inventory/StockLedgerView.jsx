import React, { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  CalendarClock,
  FileSpreadsheet,
  History,
  Layers,
  Package,
} from "lucide-react";
import {
  formatMovementType,
  getBatchState,
} from "./InventoryShared.jsx";
import {
  Badge,
  Button,
  Card,
  Dropdown,
  EmptyState,
} from "./InventoryUI.jsx";

const MOVEMENT_FILTERS = [
  { value: "ALL", label: "All movement types" },
  { value: "PURCHASE", label: "Purchases" },
  { value: "OPENING", label: "Opening stock" },
  { value: "ADJUSTMENT_ADD", label: "Manual additions" },
  { value: "ADJUSTMENT_SUB", label: "Manual deductions" },
  { value: "DAMAGE", label: "Damaged goods" },
  { value: "EXPIRY", label: "Expired write-offs" },
  { value: "LOSS", label: "Lost / missing" },
  { value: "INTERNAL_USE", label: "Internal use" },
  { value: "SALE", label: "Sales" },
];

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "" };
  return {
    date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  };
};

const formatDate = (value) => {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No expiry";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const StockLedgerView = ({ movements = [], batches = [], onExportCsv }) => {
  const [activeTab, setActiveTab] = useState("movements");
  const [filterType, setFilterType] = useState("ALL");

  const filteredMovements = useMemo(
    () =>
      filterType === "ALL"
        ? movements
        : movements.filter((movement) => movement.movement_type === filterType),
    [movements, filterType]
  );

  const totals = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    filteredMovements.forEach((movement) => {
      const change = Number(movement.quantity_change) || 0;
      if (change > 0) inbound += change;
      else outbound += Math.abs(change);
    });
    return { inbound, outbound };
  }, [filteredMovements]);

  const tabButtonClass = (key) =>
    `inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-semibold transition-colors ${
      activeTab === key
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="space-y-4">
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button type="button" onClick={() => setActiveTab("movements")} className={tabButtonClass("movements")}>
              <History size={13} strokeWidth={2.1} aria-hidden="true" />
              Movement ledger
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 tabular-nums">
                {movements.length}
              </span>
            </button>
            <button type="button" onClick={() => setActiveTab("batches")} className={tabButtonClass("batches")}>
              <Layers size={13} strokeWidth={2.1} aria-hidden="true" />
              Batches &amp; expiry
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 tabular-nums">
                {batches.length}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "movements" ? (
              <Dropdown
                value={filterType}
                onChange={setFilterType}
                options={MOVEMENT_FILTERS}
                ariaLabel="Filter stock movements"
                leadingIcon={Filter}
                className="w-[176px]"
              />
            ) : null}
            {onExportCsv ? (
              <Button
                variant="secondary"
                leftIcon={FileSpreadsheet}
                onClick={() => onExportCsv(activeTab)}
              >
                Export {activeTab === "batches" ? "batches" : "ledger"}
              </Button>
            ) : null}
          </div>
        </div>

        {activeTab === "movements" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-600">
              {filteredMovements.length} records
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10.5px] font-bold text-emerald-700 tabular-nums">
              <ArrowUpRight size={11} strokeWidth={2.4} aria-hidden="true" /> +{totals.inbound} in
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[10.5px] font-bold text-rose-700 tabular-nums">
              <ArrowDownRight size={11} strokeWidth={2.4} aria-hidden="true" /> −{totals.outbound} out
            </span>
          </div>
        ) : null}
      </Card>

      {activeTab === "movements" ? (
        filteredMovements.length === 0 ? (
          <EmptyState
            icon={History}
            title="No stock movements yet"
            description="Receive or adjust stock to start building an auditable movement ledger."
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                    <th scope="col" className="px-4 py-2.5 font-bold">Date &amp; time</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Product</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Movement</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Change</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Balance</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Reference / reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.map((movement) => {
                    const inbound = Number(movement.quantity_change) > 0;
                    const timestamp = formatDateTime(movement.created_at);
                    return (
                      <tr key={movement.id} className="transition-colors hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <p className="font-semibold text-slate-700">{timestamp.date}</p>
                          <p className="text-[10.5px] text-slate-400 tabular-nums">{timestamp.time}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="max-w-[220px] truncate font-bold text-slate-900">
                            {movement.product_name || "Gym product"}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-slate-400">
                            {movement.variant_name ? <span>{movement.variant_name}</span> : null}
                            {movement.batch_number ? <span className="font-mono">Batch {movement.batch_number}</span> : null}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={inbound ? "emerald" : "rose"} dot>
                            {formatMovementType(movement.movement_type)}
                          </Badge>
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-extrabold tabular-nums ${
                            inbound ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {inbound ? `+${movement.quantity_change}` : movement.quantity_change}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-700 tabular-nums">
                          {movement.quantity_after}
                        </td>
                        <td className="px-4 py-2.5">
                          {movement.reference_id ? (
                            <p className="max-w-[200px] truncate font-mono text-[10.5px] font-semibold text-slate-600">
                              {movement.reference_id}
                            </p>
                          ) : null}
                          <p className="max-w-[240px] truncate text-[11px] text-slate-500">
                            {movement.reason || "—"}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-2.5">
              <p className="text-[11px] text-slate-500">
                Showing the latest {filteredMovements.length} movement records from this gym&apos;s vault. Adjust stock to append new entries.
              </p>
            </div>
          </Card>
        )
      ) : batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches recorded"
          description="Receive stock with a batch number and expiry date to track shelf life and FEFO rotation."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                  <th scope="col" className="px-4 py-2.5 font-bold">Batch</th>
                  <th scope="col" className="px-4 py-2.5 font-bold">Product</th>
                  <th scope="col" className="px-4 py-2.5 font-bold">Supplier</th>
                  <th scope="col" className="px-4 py-2.5 font-bold">Expiry</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-bold">Available</th>
                  <th scope="col" className="px-4 py-2.5 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => {
                  const state = getBatchState(batch);
                  return (
                    <tr key={batch.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-mono text-[11.5px] font-bold text-slate-800">
                        {batch.batch_number}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="max-w-[240px] truncate font-bold text-slate-900">{batch.product_name}</p>
                        {batch.variant_name ? (
                          <p className="text-[10.5px] text-slate-400">{batch.variant_name}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{batch.supplier_name || "Direct"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <CalendarClock size={12} className="text-slate-400" aria-hidden="true" />
                          {formatDate(batch.expires_at)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-600 tabular-nums">
                        {batch.available_quantity}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge tone={state.tone} dot>{state.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 border-t border-slate-200/80 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500">
            <Package size={12} className="text-slate-400" aria-hidden="true" />
            {batches.length} batch{batches.length === 1 ? "" : "es"} tracked
          </div>
        </Card>
      )}
    </div>
  );
};
