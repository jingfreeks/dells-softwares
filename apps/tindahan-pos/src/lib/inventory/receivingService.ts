import { supabase } from "@/lib/supabaseClient";
import type { ReceivingEntry } from "@/lib/storeData/storeDataContext";
import type { ReceivingLine } from "./inventory";

/**
 * Receiving data access.
 *
 * Named submitReceiving, not receiveStock: inventory.ts already exports a
 * receiveStock() that is the pure stock arithmetic, and the two would collide
 * in this directory's barrel. Different responsibilities, so different names --
 * the arithmetic decides what the levels become, this records the delivery.
 *
 * The provider keeps the refresh, as with the other services.
 */

const RECEIVING_ENTRY_SELECT =
  "id, supplier, supplier_id, dr_number, paid, paid_at, received_on, receiving_lines(product_id, product_name, quantity, cost_each)";

function mapReceivingEntryRow(row: {
  id: string;
  supplier: string;
  supplier_id: string | null;
  dr_number: string | null;
  paid: boolean;
  paid_at: string | null;
  received_on: string;
  receiving_lines:
    | { product_id: string | null; product_name: string; quantity: number; cost_each: number }[]
    | null;
}): ReceivingEntry {
  return {
    id: row.id,
    date: row.received_on,
    supplier: row.supplier,
    supplierId: row.supplier_id,
    drNumber: row.dr_number,
    paid: row.paid,
    paidAt: row.paid_at,
    lines: (row.receiving_lines ?? []).map((line) => ({
      productId: line.product_id ?? "",
      productName: line.product_name,
      quantity: line.quantity,
      costEach: line.cost_each,
    })),
  };
}

/**
 * One RPC, one transaction (#462, 20260903140000).
 *
 * This used to raise stock line by line and then write the receiving record,
 * which are guarded by different conditions -- so a store whose receiving
 * feature was revoked, whose INVENTORY module was off, or whose subscription
 * was suspended would inflate its stock and then be told the save failed, with
 * no record explaining the movement and a retry that added it again.
 */
export async function submitReceiving(
  supplier: string,
  receivedOn: string,
  lines: ReceivingLine[],
  supplierId: string | null = null,
  drNumber: string | null = null
): Promise<void> {
  const { error } = await supabase.rpc("receive_stock", {
    p_supplier: supplier,
    p_received_on: receivedOn,
    p_lines: lines.map((line) => ({
      product_id: line.productId,
      product_name: line.productName,
      quantity: line.quantity,
      cost_each: line.costEach,
    })),
    p_supplier_id: supplierId,
    p_dr_number: drNumber,
  });
  if (error) throw error;
}

export async function listReceivingHistory(limit = 50): Promise<ReceivingEntry[]> {
  const { data, error } = await supabase
    .from("receiving_entries")
    .select(RECEIVING_ENTRY_SELECT)
    .order("received_on", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapReceivingEntryRow);
}

export { RECEIVING_ENTRY_SELECT, mapReceivingEntryRow };
