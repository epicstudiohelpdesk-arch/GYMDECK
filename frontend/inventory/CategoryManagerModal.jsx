import React, { useState } from "react";
import { Check, FolderTree, Pencil, Plus, X } from "lucide-react";
import {
  Button,
  EmptyState,
  IconButton,
  InlineAlert,
  Modal,
  TextField,
} from "./InventoryUI.jsx";
import { createCategory, updateCategory } from "../inventoryApi.js";

export const CategoryManagerModal = ({ isOpen, onClose, categories = [], onUpdated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAdd = async (event) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) return;

    setSaving(true);
    try {
      await createCategory({ name: name.trim(), description: description.trim() || null });
      setName("");
      setDescription("");
      onUpdated?.();
    } catch (err) {
      setError(err?.message || "The category could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (category) => {
    if (!editName.trim()) return;
    setError("");
    try {
      await updateCategory({
        id: category.id,
        name: editName.trim(),
        description: category.description,
        icon: category.icon,
        is_active: category.is_active,
      });
      setEditingId(null);
      onUpdated?.();
    } catch (err) {
      setError(err?.message || "The category could not be updated.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={FolderTree}
      title="Product categories"
      description="Group merchandise, supplements and equipment for faster filtering."
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        {error ? <InlineAlert title="Category action failed">{error}</InlineAlert> : null}

        <form onSubmit={handleAdd} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <TextField
              label="Category name"
              required
              placeholder="e.g. Supplements"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <TextField
              label="Description"
              placeholder="Optional short note"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              leftIcon={Plus}
              disabled={saving || !name.trim()}
              className="h-10"
            >
              Add
            </Button>
          </div>
        </form>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">
              Existing categories
            </h3>
            <span className="text-[10.5px] font-semibold text-slate-400 tabular-nums">
              {categories.length} total
            </span>
          </div>

          {categories.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="No categories yet"
              description="Add a category above, then assign products to it from the product editor."
              className="py-8"
            />
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
              {categories.map((category) => (
                <li key={category.id} className="flex items-center gap-2 px-3 py-2.5">
                  {editingId === category.id ? (
                    <>
                      <TextField
                        aria-label="Category name"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="min-w-0 flex-1"
                        autoFocus
                      />
                      <IconButton
                        label="Save category name"
                        icon={Check}
                        onClick={() => handleSaveEdit(category)}
                        className="text-emerald-600 hover:bg-emerald-50"
                      />
                      <IconButton
                        label="Cancel editing"
                        icon={X}
                        onClick={() => setEditingId(null)}
                        className="text-slate-400"
                      />
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold text-slate-800">{category.name}</p>
                        {category.description ? (
                          <p className="truncate text-[10.5px] text-slate-400">{category.description}</p>
                        ) : (
                          <p className="text-[10.5px] italic text-slate-300">No description</p>
                        )}
                      </div>
                      <IconButton
                        label={`Rename ${category.name}`}
                        icon={Pencil}
                        onClick={() => {
                          setEditingId(category.id);
                          setEditName(category.name);
                        }}
                        className="text-slate-400 hover:text-orange-600"
                      />
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};
