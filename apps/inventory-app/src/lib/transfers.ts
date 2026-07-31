import { supabase } from "./supabaseClient";
import type { WarehouseTransfer } from "./types";

function toTransfer(row: {
  id: string;
  store_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  created_by: string;
  created_at: string;
}): WarehouseTransfer {
  return {
    id: row.id,
    storeId: row.store_id,
    fromWarehouseId: row.from_warehouse_id,
    toWarehouseId: row.to_warehouse_id,
    productId: row.product_id,
    quantity: row.quantity,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function listTransfers(storeId: string): Promise<WarehouseTransfer[]> {
  const { data, error } = await supabase
    .from("warehouse_transfers")
    .select(
      "id, store_id, from_warehouse_id, to_warehouse_id, product_id, quantity, notes, created_by, created_at"
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toTransfer);
}

export async function transferStock(input: {
  fromWarehouseId: string;
  toWarehouseId: string;
  productId: string;
  quantity: number;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("transfer_stock", {
    p_from_warehouse_id: input.fromWarehouseId,
    p_to_warehouse_id: input.toWarehouseId,
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
}
