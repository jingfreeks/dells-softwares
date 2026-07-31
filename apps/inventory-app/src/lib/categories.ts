import { supabase } from "./supabaseClient";

export interface Category {
  id: string;
  name: string;
}

export async function listCategories(storeId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
