import { supabase } from "./supabaseClient";
import type { ReceivingEntry, ReceivingLine } from "./types";

function toLine(row: {
  id: string;
  receiving_entry_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  cost_each: number;
}): ReceivingLine {
  return {
    id: row.id,
    receivingEntryId: row.receiving_entry_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    costEach: row.cost_each,
  };
}

export async function listReceivingHistory(storeId: string): Promise<ReceivingEntry[]> {
  const { data: entries, error } = await supabase
    .from("receiving_entries")
    .select("id, store_id, supplier, supplier_id, received_on, purchase_order_id, warehouse_id, created_by, created_at")
    .eq("store_id", storeId)
    .order("received_on", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!entries || entries.length === 0) return [];

  const { data: lines, error: linesError } = await supabase
    .from("receiving_lines")
    .select("id, receiving_entry_id, product_id, product_name, quantity, cost_each")
    .in(
      "receiving_entry_id",
      entries.map((e) => e.id)
    );
  if (linesError) throw new Error(linesError.message);

  return entries.map((entry) => ({
    id: entry.id,
    storeId: entry.store_id,
    supplier: entry.supplier,
    supplierId: entry.supplier_id,
    receivedOn: entry.received_on,
    warehouseId: entry.warehouse_id,
    purchaseOrderId: entry.purchase_order_id,
    createdBy: entry.created_by,
    createdAt: entry.created_at,
    lines: (lines ?? []).filter((l) => l.receiving_entry_id === entry.id).map(toLine),
  }));
}

export interface ReceiveStockLine {
  productId: string | null;
  productName: string;
  quantity: number;
  costEach: number;
}

/**
 * Records a delivery: creates the receiving_entries/receiving_lines rows,
 * bumps stock (products.stock for the default warehouse, warehouse_stock
 * otherwise), and — when fulfilling a PO — advances quantity_received on
 * each matching purchase_order_lines row and rolls the PO's status up to
 * partially_received/received.
 *
 * Not wrapped in a DB transaction (no RPC exists for this yet), so a
 * failure partway through can leave a receiving entry saved without every
 * side effect applied — acceptable for this app's scope, but a good
 * candidate for a future `receive_stock()` Postgres function.
 */
export async function receiveStock(input: {
  storeId: string;
  supplier: string;
  supplierId: string | null;
  receivedOn: string;
  warehouseId: string;
  isDefaultWarehouse: boolean;
  purchaseOrderId: string | null;
  createdBy: string;
  lines: ReceiveStockLine[];
}): Promise<void> {
  const { data: entry, error: entryError } = await supabase
    .from("receiving_entries")
    .insert({
      store_id: input.storeId,
      supplier: input.supplier,
      supplier_id: input.supplierId,
      received_on: input.receivedOn,
      warehouse_id: input.warehouseId,
      purchase_order_id: input.purchaseOrderId,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (entryError) throw new Error(entryError.message);

  const { error: linesError } = await supabase.from("receiving_lines").insert(
    input.lines.map((line) => ({
      receiving_entry_id: entry.id,
      product_id: line.productId,
      product_name: line.productName,
      quantity: line.quantity,
      cost_each: line.costEach,
    }))
  );
  if (linesError) throw new Error(linesError.message);

  for (const line of input.lines) {
    if (!line.productId) continue;
    if (input.isDefaultWarehouse) {
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", line.productId)
        .single();
      if (fetchError) throw new Error(fetchError.message);
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: product.stock + line.quantity })
        .eq("id", line.productId);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { data: existing } = await supabase
        .from("warehouse_stock")
        .select("id, quantity")
        .eq("warehouse_id", input.warehouseId)
        .eq("product_id", line.productId)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from("warehouse_stock")
          .update({ quantity: existing.quantity + line.quantity, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (updateError) throw new Error(updateError.message);
      } else {
        const { error: insertError } = await supabase.from("warehouse_stock").insert({
          warehouse_id: input.warehouseId,
          product_id: line.productId,
          quantity: line.quantity,
        });
        if (insertError) throw new Error(insertError.message);
      }
    }
  }

  if (input.purchaseOrderId) {
    await applyReceivingToPurchaseOrder(input.purchaseOrderId, input.lines);
  }
}

async function applyReceivingToPurchaseOrder(purchaseOrderId: string, lines: ReceiveStockLine[]): Promise<void> {
  const { data: poLines, error } = await supabase
    .from("purchase_order_lines")
    .select("id, product_id, quantity_ordered, quantity_received")
    .eq("purchase_order_id", purchaseOrderId);
  if (error) throw new Error(error.message);

  const updated = poLines ?? [];
  for (const line of lines) {
    if (!line.productId) continue;
    const match = updated.find((pl) => pl.product_id === line.productId);
    if (!match) continue;
    const newReceived = match.quantity_received + line.quantity;
    const { error: updateError } = await supabase
      .from("purchase_order_lines")
      .update({ quantity_received: newReceived })
      .eq("id", match.id);
    if (updateError) throw new Error(updateError.message);
    match.quantity_received = newReceived;
  }

  const fullyReceived = updated.every((line) => line.quantity_received >= line.quantity_ordered);
  const anyReceived = updated.some((line) => line.quantity_received > 0);
  const nextStatus = fullyReceived ? "received" : anyReceived ? "partially_received" : undefined;

  if (nextStatus) {
    const { error: poUpdateError } = await supabase
      .from("purchase_orders")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", purchaseOrderId);
    if (poUpdateError) throw new Error(poUpdateError.message);
  }
}
