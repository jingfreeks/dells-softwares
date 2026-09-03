import { supabase } from "@/lib/supabaseClient";
import type { Category } from "@/lib/types";

/**
 * Category data access.
 *
 * Lifted out of StoreDataProvider. The provider keeps the refresh -- renaming a
 * category changes what products display, so it re-reads both lists, which is
 * its business and not this module's.
 *
 * The Postgres error codes are translated here rather than at each call site,
 * because "what 23505 means for a category" is domain knowledge and it was
 * written out twice in the original.
 */

/** 23505 unique_violation, 23503 foreign_key_violation. */
function isCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === code;
}

export async function createCategory(storeId: string, name: string): Promise<Category> {
  const trimmed = name.trim();
  const { data, error } = await supabase
    .from("categories")
    .insert({ store_id: storeId, name: trimmed })
    .select("id, name")
    .single();
  if (error) {
    if (isCode(error, "23505")) throw new Error(`"${trimmed}" already exists.`);
    throw error;
  }
  return data;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  const { error } = await supabase.from("categories").update({ name: trimmed }).eq("id", id);
  if (error) {
    if (isCode(error, "23505")) throw new Error(`"${trimmed}" already exists.`);
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    // The database is the source of truth for "is this category still in
    // use", never a client-side count that could go stale.
    if (isCode(error, "23503")) {
      throw new Error("This category is still assigned to one or more products.");
    }
    throw error;
  }
}

/**
 * Reassigns every product, then deletes the emptied category.
 *
 * Routed through deleteCategory rather than duplicating the delete: the
 * foreign-key guard there cannot fire once the category is empty, but a policy
 * could still refuse for another reason, and that refusal should read the same
 * either way.
 */
export async function mergeCategories(fromId: string, toId: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ category_id: toId })
    .eq("category_id", fromId);
  if (error) throw error;
  await deleteCategory(fromId);
}
