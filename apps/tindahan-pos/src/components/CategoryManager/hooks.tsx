import { useState } from "react";
import {
  useStoreData,
  ERROR_COULD_NOT_ADD_CATEGORY,
  ERROR_COULD_NOT_RENAME_CATEGORY,
  ERROR_COULD_NOT_DELETE_CATEGORY,
  ERROR_COULD_NOT_MERGE_CATEGORY,
  type Category,
} from "@/lib";

export const useCategoryManager = () => {
  const { categories, products, addCategory, renameCategory, removeCategory, mergeCategory } =
    useStoreData();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Category | null>(null);
  const [mergeIntoId, setMergeIntoId] = useState("");

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
      setError(
        err instanceof Error ? err.message : ERROR_COULD_NOT_ADD_CATEGORY,
      );
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
      setError(
        err instanceof Error ? err.message : ERROR_COULD_NOT_RENAME_CATEGORY,
      );
    } finally {
      setBusyId(null);
    }
  }

  function requestDelete(category: Category) {
    setError(null);
    const otherCategories = categories.filter((c) => c.id !== category.id);
    setMergeIntoId(otherCategories[0]?.id ?? "");
    setConfirmTarget(category);
  }

  function cancelDelete() {
    setConfirmTarget(null);
    setMergeIntoId("");
  }

  async function confirmDelete() {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    const count = usageCount(id);
    setBusyId(id);
    setError(null);
    try {
      if (count > 0) {
        if (!mergeIntoId) return;
        await mergeCategory(id, mergeIntoId);
      } else {
        await removeCategory(id);
      }
      setConfirmTarget(null);
      setMergeIntoId("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : count > 0
            ? ERROR_COULD_NOT_MERGE_CATEGORY
            : ERROR_COULD_NOT_DELETE_CATEGORY,
      );
    } finally {
      setBusyId(null);
    }
  }

  return {
    categories,
    products,
    addCategory,
    renameCategory,
    removeCategory,

    newName,
    setNewName,
    adding,
    setAdding,
    editingId,
    setEditingId,
    editName,
    setEditName,
    busyId,
    setBusyId,
    error,
    setError,
    usageCount,
    handleAdd,
    startEdit,
    handleRename,
    confirmTarget,
    mergeIntoId,
    setMergeIntoId,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
};
