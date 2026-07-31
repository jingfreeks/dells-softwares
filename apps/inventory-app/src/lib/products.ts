import { supabase } from "./supabaseClient";
import type { Product } from "./types";

export async function listProducts(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, barcode, name, price, stock, low_stock_threshold, category, category_id, image_url")
    .eq("store_id", storeId)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    price: row.price,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    categoryId: row.category_id,
    category: row.category,
    imageUrl: row.image_url,
  }));
}

export async function createProduct(input: {
  storeId: string;
  name: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  categoryId: string;
  barcode: string | null;
}): Promise<void> {
  const { error } = await supabase.from("products").insert({
    store_id: input.storeId,
    name: input.name,
    price: input.price,
    stock: input.stock,
    low_stock_threshold: input.lowStockThreshold,
    category_id: input.categoryId,
    barcode: input.barcode,
  });
  if (error) throw new Error(error.message);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
