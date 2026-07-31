import { supabase } from "./supabaseClient";
import type { BeginningBalance } from "./types";

function toBalance(row: {
  id: string;
  store_id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  as_of_date: string;
  created_by: string;
  created_at: string;
}): BeginningBalance {
  return {
    id: row.id,
    storeId: row.store_id,
    warehouseId: row.warehouse_id,
    productId: row.product_id,
    quantity: row.quantity,
    unitCost: row.unit_cost,
    asOfDate: row.as_of_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function listBeginningBalances(warehouseId: string): Promise<BeginningBalance[]> {
  const { data, error } = await supabase
    .from("inventory_beginning_balances")
    .select("id, store_id, warehouse_id, product_id, quantity, unit_cost, as_of_date, created_by, created_at")
    .eq("warehouse_id", warehouseId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toBalance);
}

/** One snapshot row per (warehouse, product) — upserts on the unique constraint. */
export async function setBeginningBalance(input: {
  storeId: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  asOfDate: string;
  createdBy: string;
}): Promise<BeginningBalance> {
  const { data, error } = await supabase
    .from("inventory_beginning_balances")
    .upsert(
      {
        store_id: input.storeId,
        warehouse_id: input.warehouseId,
        product_id: input.productId,
        quantity: input.quantity,
        unit_cost: input.unitCost,
        as_of_date: input.asOfDate,
        created_by: input.createdBy,
      },
      { onConflict: "warehouse_id,product_id" }
    )
    .select("id, store_id, warehouse_id, product_id, quantity, unit_cost, as_of_date, created_by, created_at")
    .single();

  if (error) throw new Error(error.message);
  return toBalance(data);
}
