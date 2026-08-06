import { useState } from "react";
import {
  useStoreData,
  ERROR_COULD_NOT_ADD_CATEGORY,
  ERROR_COULD_NOT_RENAME_CATEGORY,
  ERROR_COULD_NOT_DELETE_CATEGORY,
  type Category,
} from "@/lib";

export const useCategoryManager = () => {
  const { categories, products, addCategory, renameCategory, removeCategory } =
    useStoreData();
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

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await removeCategory(id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : ERROR_COULD_NOT_DELETE_CATEGORY,
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
    handleDelete,
  };
};
