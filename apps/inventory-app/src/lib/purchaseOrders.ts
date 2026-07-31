import { supabase } from "./supabaseClient";
import type { PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus } from "./types";

function toPurchaseOrder(row: {
  id: string;
  store_id: string;
  supplier_id: string | null;
  warehouse_id: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}): PurchaseOrder {
  return {
    id: row.id,
    storeId: row.store_id,
    supplierId: row.supplier_id,
    warehouseId: row.warehouse_id,
    status: row.status,
    orderDate: row.order_date,
    expectedDate: row.expected_date,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLine(row: {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
}): PurchaseOrderLine {
  return {
    id: row.id,
    purchaseOrderId: row.purchase_order_id,
    productId: row.product_id,
    productName: row.product_name,
    quantityOrdered: row.quantity_ordered,
    quantityReceived: row.quantity_received,
    unitCost: row.unit_cost,
  };
}

export async function listPurchaseOrders(storeId: string): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("id, store_id, supplier_id, warehouse_id, status, order_date, expected_date, notes, created_by, created_at, updated_at")
    .eq("store_id", storeId)
    .order("order_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toPurchaseOrder);
}

export async function listPurchaseOrderLines(purchaseOrderId: string): Promise<PurchaseOrderLine[]> {
  const { data, error } = await supabase
    .from("purchase_order_lines")
    .select("id, purchase_order_id, product_id, product_name, quantity_ordered, quantity_received, unit_cost")
    .eq("purchase_order_id", purchaseOrderId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(toLine);
}

export interface NewPurchaseOrderLine {
  productId: string | null;
  productName: string;
  quantityOrdered: number;
  unitCost: number;
}

export async function createPurchaseOrder(input: {
  storeId: string;
  supplierId: string | null;
  warehouseId: string;
  expectedDate: string | null;
  notes: string | null;
  createdBy: string;
  lines: NewPurchaseOrderLine[];
}): Promise<PurchaseOrder> {
  const { data: poRow, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      store_id: input.storeId,
      supplier_id: input.supplierId,
      warehouse_id: input.warehouseId,
      status: "draft",
      expected_date: input.expectedDate,
      notes: input.notes,
      created_by: input.createdBy,
    })
    .select("id, store_id, supplier_id, warehouse_id, status, order_date, expected_date, notes, created_by, created_at, updated_at")
    .single();

  if (poError) throw new Error(poError.message);

  if (input.lines.length > 0) {
    const { error: linesError } = await supabase.from("purchase_order_lines").insert(
      input.lines.map((line) => ({
        purchase_order_id: poRow.id,
        product_id: line.productId,
        product_name: line.productName,
        quantity_ordered: line.quantityOrdered,
        unit_cost: line.unitCost,
      }))
    );
    if (linesError) throw new Error(linesError.message);
  }

  return toPurchaseOrder(poRow);
}

export async function submitPurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft");

  if (error) throw new Error(error.message);
}

export async function cancelPurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
