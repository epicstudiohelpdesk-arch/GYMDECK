import React, { useState } from "react";
import { Users, Plus, Pencil, X, Phone, Mail, MapPin, AlertCircle } from "lucide-react";
import { createSupplier, updateSupplier } from "../inventoryApi.js";

export const SupplierManagerModal = ({ isOpen, onClose, suppliers = [], onUpdated }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const openForm = (sup = null) => {
    setError("");
    if (sup) {
      setEditingSupplier(sup);
      setSupplierName(sup.supplier_name || "");
      setContactPerson(sup.contact_person || "");
      setPhone(sup.phone || "");
      setEmail(sup.email || "");
      setAddress(sup.address || "");
      setGstin(sup.gstin || "");
    } else {
      setEditingSupplier(null);
      setSupplierName("");
      setContactPerson("");
      setPhone("");
      setEmail("");
      setAddress("");
      setGstin("");
    }
    setIsAdding(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!supplierName.trim()) {
      setError("Supplier name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplierName: supplierName.trim(),
        contactPerson: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        gstin: gstin.trim() || null,
      };

      if (editingSupplier?.id) {
        await updateSupplier(editingSupplier.id, payload);
      } else {
        await createSupplier(payload);
      }

      setIsAdding(false);
      onUpdated?.();
    } catch (err) {
      setError(err?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Users className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Merchandise & Supplement Suppliers</h3>
              <p className="text-xs text-slate-400">Keep records of wholesale vendors and purchase contacts.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {isAdding ? (
            <form onSubmit={handleSave} className="space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800">
                {editingSupplier ? "Edit Supplier" : "New Supplier Details"}
              </h4>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Nutrition Distributors"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Email</label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">GSTIN</label>
                  <input
                    type="text"
                    placeholder="07AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  {saving ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500">
                {suppliers.length} active supplier records
              </span>
              <button
                onClick={() => openForm(null)}
                className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs"
              >
                <Plus className="h-4 w-4" /> Add Supplier
              </button>
            </div>
          )}

          {/* Supplier Cards List */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl max-h-72 overflow-y-auto">
            {suppliers.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No suppliers recorded yet.</p>
            ) : (
              suppliers.map((s) => (
                <div key={s.id} className="p-3.5 bg-white hover:bg-slate-50/50 flex items-start justify-between">
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-slate-900">{s.supplier_name}</h5>
                    {s.contact_person ? (
                      <p className="text-[11px] font-medium text-slate-600">Contact: {s.contact_person}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 pt-0.5">
                      {s.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {s.phone}
                        </span>
                      ) : null}
                      {s.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {s.email}
                        </span>
                      ) : null}
                      {s.gstin ? <span>GSTIN: {s.gstin}</span> : null}
                    </div>
                  </div>
                  <button
                    onClick={() => openForm(s)}
                    className="p-1.5 text-slate-400 hover:text-orange-600 rounded-lg transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 bg-white px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
