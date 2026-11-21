import React, { useState } from "react";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Users,
} from "lucide-react";
import {
  Button,
  EmptyState,
  IconButton,
  InlineAlert,
  Modal,
  SectionHeading,
  TextAreaField,
  TextField,
} from "./InventoryUI.jsx";
import { createSupplier, updateSupplier } from "../inventoryApi.js";

export const SupplierManagerModal = ({ isOpen, onClose, suppliers = [], onUpdated }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [supplierName, setSupplierName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const openForm = (supplier = null) => {
    setError("");
    setEditingSupplier(supplier);
    setSupplierName(supplier?.supplier_name || "");
    setContactPerson(supplier?.contact_person || "");
    setPhone(supplier?.phone || "");
    setEmail(supplier?.email || "");
    setAddress(supplier?.address || "");
    setGstin(supplier?.gstin || "");
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingSupplier(null);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    if (!supplierName.trim()) {
      setError("A supplier name is required.");
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

      if (editingSupplier?.id) await updateSupplier(editingSupplier.id, payload);
      else await createSupplier(payload);

      setIsAdding(false);
      setEditingSupplier(null);
      onUpdated?.();
    } catch (err) {
      setError(err?.message || "The supplier could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Users}
      title="Suppliers"
      description="Wholesale vendors and purchase contacts for your inventory."
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        {error ? <InlineAlert title="Supplier action failed">{error}</InlineAlert> : null}

        {isAdding ? (
          <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeading
              icon={Users}
              title={editingSupplier ? "Edit supplier" : "New supplier"}
              description="Contact details are used on purchase receipts and reorder lists."
              aside={
                <IconButton
                  label="Back to supplier list"
                  icon={ArrowLeft}
                  onClick={closeForm}
                  className="text-slate-400"
                />
              }
              className="mb-4"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField
                className="sm:col-span-2"
                label="Supplier / business name"
                required
                placeholder="e.g. Apex Nutrition Distributors"
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
              />
              <TextField
                label="Contact person"
                placeholder="e.g. Rahul Sharma"
                value={contactPerson}
                onChange={(event) => setContactPerson(event.target.value)}
              />
              <TextField
                label="Phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <TextField
                label="Email"
                type="email"
                placeholder="sales@vendor.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <TextField
                label="GSTIN"
                placeholder="07AAAAA0000A1Z5"
                value={gstin}
                onChange={(event) => setGstin(event.target.value)}
                inputClassName="font-mono uppercase"
              />
              <TextAreaField
                className="sm:col-span-2"
                label="Address"
                rows={2}
                placeholder="Warehouse or billing address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="ghost" onClick={closeForm} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? "Saving…" : editingSupplier ? "Update supplier" : "Save supplier"}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11.5px] font-medium text-slate-500">
                <span className="font-bold text-slate-700 tabular-nums">{suppliers.length}</span> supplier record
                {suppliers.length === 1 ? "" : "s"}
              </p>
              <Button variant="primary" leftIcon={Plus} onClick={() => openForm(null)}>
                Add supplier
              </Button>
            </div>

            {suppliers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No suppliers recorded"
                description="Add wholesale vendors so you can attach purchase invoices and restock products faster."
                action={
                  <Button variant="secondary" leftIcon={Plus} onClick={() => openForm(null)}>
                    Add your first supplier
                  </Button>
                }
              />
            ) : (
              <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                {suppliers.map((supplier) => (
                  <li key={supplier.id} className="flex items-start gap-3 px-3.5 py-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <Users size={14} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-slate-900">
                        {supplier.supplier_name}
                      </p>
                      {supplier.contact_person ? (
                        <p className="text-[11px] text-slate-500">{supplier.contact_person}</p>
                      ) : null}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-400">
                        {supplier.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={10} aria-hidden="true" /> {supplier.phone}
                          </span>
                        ) : null}
                        {supplier.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail size={10} aria-hidden="true" /> {supplier.email}
                          </span>
                        ) : null}
                        {supplier.gstin ? (
                          <span className="font-mono uppercase">GSTIN {supplier.gstin}</span>
                        ) : null}
                        {supplier.address ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin size={10} className="shrink-0" aria-hidden="true" />
                            <span className="truncate">{supplier.address}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <IconButton
                      label={`Edit ${supplier.supplier_name}`}
                      icon={Pencil}
                      onClick={() => openForm(supplier)}
                      className="text-slate-400 hover:text-orange-600"
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
