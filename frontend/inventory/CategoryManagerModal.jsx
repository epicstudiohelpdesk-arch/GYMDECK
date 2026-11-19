import React, { useState } from "react";
import { FolderTree, Plus, Pencil, Check, X, AlertCircle } from "lucide-react";
import { createCategory, updateCategory } from "../inventoryApi.js";

export const CategoryManagerModal = ({ isOpen, onClose, categories = [], onUpdated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;

    setSaving(true);
    try {
      await createCategory({ name: name.trim(), description: description.trim() || null });
      setName("");
      setDescription("");
      onUpdated?.();
    } catch (err) {
      setError(err?.message || "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (cat) => {
    if (!editName.trim()) return;
    try {
      await updateCategory({
        id: cat.id,
        name: editName.trim(),
        description: cat.description,
        icon: cat.icon,
        is_active: cat.is_active,
      });
      setEditingId(null);
      onUpdated?.();
    } catch (err) {
      setError(err?.message || "Failed to update category");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <FolderTree className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Product Categories</h3>
              <p className="text-xs text-slate-400">Classify merchandise, supplements and equipment.</p>
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

          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="New category name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex items-center gap-1 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>

          {/* Categories List */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl max-h-60 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">No categories created yet.</p>
            ) : (
              categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/50">
                  {editingId === c.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 flex-1 rounded-lg border border-orange-400 px-2 text-xs font-bold text-slate-900"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(c)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{c.name}</span>
                        {c.description ? (
                          <span className="text-[10px] text-slate-400">{c.description}</span>
                        ) : null}
                      </div>
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditName(c.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-orange-600 rounded-lg transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
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
