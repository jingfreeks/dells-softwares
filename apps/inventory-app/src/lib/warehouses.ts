import { supabase } from "./supabaseClient";
import type { Warehouse, WarehouseStock } from "./types";

function toWarehouse(row: {
  id: string;
  store_id: string;
  name: string;
  address: string | null;
  is_default: boolean;
  created_at: string;
}): Warehouse {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    address: row.address,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export async function listWarehouses(storeId: string): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, store_id, name, address, is_default, created_at")
    .eq("store_id", storeId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toWarehouse);
}

/** New warehouses are never the default — every store's default warehouse
 * is seeded by the migration and represents products.stock. */
export async function addWarehouse(
  storeId: string,
  name: string,
  address?: string | null
): Promise<Warehouse> {
  const { data, error } = await supabase
    .from("warehouses")
    .insert({ store_id: storeId, name: name.trim(), address: address?.trim() || null })
    .select("id, store_id, name, address, is_default, created_at")
    .single();

  if (error) throw new Error(error.message);
  return toWarehouse(data);
}

/** Stock for a specific warehouse. Callers must pass `isDefault` because the
 * default warehouse's stock lives on products.stock, not warehouse_stock. */
export async function getWarehouseStock(warehouseId: string, isDefault: boolean): Promise<WarehouseStock[]> {
  if (isDefault) return [];
  const { data, error } = await supabase
    .from("warehouse_stock")
    .select("id, warehouse_id, product_id, quantity, updated_at")
    .eq("warehouse_id", warehouseId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    warehouseId: row.warehouse_id,
    productId: row.product_id,
    quantity: row.quantity,
    updatedAt: row.updated_at,
  }));
}
