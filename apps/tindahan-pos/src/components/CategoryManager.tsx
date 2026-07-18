import { useState } from "react";
import { useStoreData } from "../lib/storeData";
import type { Category } from "../lib/types";

interface CategoryManagerProps {
  onClose: () => void;
}

export function CategoryManager({ onClose }: CategoryManagerProps) {
  const { categories, products, addCategory, renameCategory, removeCategory } = useStoreData();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function usageCount(categoryId: string) {
    return products.filter((p) => p.categoryId === categoryId).length;
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await addCategory(newName);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add category.");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setError(null);
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    setBusyId(id);
    setError(null);
    try {
      await renameCategory(id, editName);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename category.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await removeCategory(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete category.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Manage categories</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-sm text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newName.trim() || adding}
            className="cursor-pointer rounded-lg bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <ul className="mt-4 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
          {categories.map((category) => {
            const count = usageCount(category.id);
            const isEditing = editingId === category.id;
            const isBusy = busyId === category.id;
            return (
              <li key={category.id} className="flex items-center gap-2 px-3 py-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(category.id)}
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                    {category.name}
                    <span className="ml-2 text-xs text-slate-400">
                      {count} product{count === 1 ? "" : "s"}
                    </span>
                  </span>
                )}

                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRename(category.id)}
                      disabled={isBusy}
                      className="cursor-pointer text-xs font-medium text-[var(--color-brand)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="cursor-pointer text-xs text-slate-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      className="cursor-pointer text-xs font-medium text-slate-600 hover:underline"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category.id)}
                      disabled={count > 0 || isBusy}
                      title={count > 0 ? "Reassign or remove its products first" : undefined}
                      className="cursor-pointer text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            );
          })}
          {categories.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-slate-400">No categories yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
