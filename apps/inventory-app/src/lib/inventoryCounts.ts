import { supabase } from "./supabaseClient";
import type { InventoryCount, InventoryCountLine } from "./types";

function toCount(row: {
  id: string;
  store_id: string;
  warehouse_id: string;
  status: "open" | "closed";
  counted_on: string;
  created_by: string;
  created_at: string;
  closed_at: string | null;
}): InventoryCount {
  return {
    id: row.id,
    storeId: row.store_id,
    warehouseId: row.warehouse_id,
    status: row.status,
    countedOn: row.counted_on,
    createdBy: row.created_by,
    createdAt: row.created_at,
    closedAt: row.closed_at,
  };
}

function toLine(row: {
  id: string;
  inventory_count_id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number;
  variance: number;
}): InventoryCountLine {
  return {
    id: row.id,
    inventoryCountId: row.inventory_count_id,
    productId: row.product_id,
    systemQuantity: row.system_quantity,
    countedQuantity: row.counted_quantity,
    variance: row.variance,
  };
}

export async function listInventoryCounts(storeId: string): Promise<InventoryCount[]> {
  const { data, error } = await supabase
    .from("inventory_counts")
    .select("id, store_id, warehouse_id, status, counted_on, created_by, created_at, closed_at")
    .eq("store_id", storeId)
    .order("counted_on", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toCount);
}

export async function startInventoryCount(input: {
  storeId: string;
  warehouseId: string;
  createdBy: string;
}): Promise<InventoryCount> {
  const { data, error } = await supabase
    .from("inventory_counts")
    .insert({ store_id: input.storeId, warehouse_id: input.warehouseId, created_by: input.createdBy })
    .select("id, store_id, warehouse_id, status, counted_on, created_by, created_at, closed_at")
    .single();

  if (error) throw new Error(error.message);
  return toCount(data);
}

export async function listCountLines(inventoryCountId: string): Promise<InventoryCountLine[]> {
  const { data, error } = await supabase
    .from("inventory_count_lines")
    .select("id, inventory_count_id, product_id, system_quantity, counted_quantity, variance")
    .eq("inventory_count_id", inventoryCountId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(toLine);
}

/** One line per product per count — upserts on the unique constraint so
 * re-entering a counted quantity for the same product just corrects it. */
export async function recordCountLine(input: {
  inventoryCountId: string;
  productId: string;
  systemQuantity: number;
  countedQuantity: number;
}): Promise<InventoryCountLine> {
  const { data, error } = await supabase
    .from("inventory_count_lines")
    .upsert(
      {
        inventory_count_id: input.inventoryCountId,
        product_id: input.productId,
        system_quantity: input.systemQuantity,
        counted_quantity: input.countedQuantity,
      },
      { onConflict: "inventory_count_id,product_id" }
    )
    .select("id, inventory_count_id, product_id, system_quantity, counted_quantity, variance")
    .single();

  if (error) throw new Error(error.message);
  return toLine(data);
}

export async function closeInventoryCount(id: string): Promise<void> {
  const { error } = await supabase
    .from("inventory_counts")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open");

  if (error) throw new Error(error.message);
}
