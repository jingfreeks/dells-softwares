import { supabase } from "@/lib/supabaseClient";
import type { SaleRecord, VatStatus } from "@/lib/types";

/**
 * Sale reads.
 *
 * The reads and the row mapper only. Writing a sale stays in
 * StoreDataProvider on purpose -- checkout() is not data access, it is
 * orchestration: an override-PIN exchange, a decision about whether a failure
 * was connectivity or a refusal, an offline enqueue, and an optimistic stock
 * update. Pulling the RPC call out of the middle of that would leave the
 * interesting half behind and make both halves harder to follow, which is the
 * opposite of the point.
 */

const SALE_SELECT =
  "id, created_at, occurred_at, total, customer_id, payment_type, reference_no, receipt_number, status, voided_at, void_reason, vat_status, vat_rate, vatable_sales, vat_amount, vat_exempt_sales, zero_rated_sales, device_id, discount_type, discount_value, discount_amount, staff:cashier_id(id, name), voided_by_staff:voided_by(id, name), device:device_id(id, name), sale_items(id, product_id, name, quantity, price, item_type, fee, line_total)";

function mapSaleRow(row: {
  id: string;
  created_at: string;
  occurred_at: string | null;
  total: number;
  customer_id: string | null;
  payment_type: SaleRecord["paymentType"];
  reference_no: string | null;
  receipt_number: string | null;
  status: SaleRecord["status"];
  voided_at: string | null;
  void_reason: string | null;
  vat_status: VatStatus | null;
  vat_rate: number | null;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  zero_rated_sales: number;
  discount_type: SaleRecord["discountType"];
  discount_value: number | null;
  discount_amount: number;
  staff: { id: string; name: string } | { id: string; name: string }[] | null;
  voided_by_staff: { id: string; name: string } | { id: string; name: string }[] | null;
  device: { id: string; name: string } | { id: string; name: string }[] | null;
  sale_items:
    | {
        id: string;
        product_id: string | null;
        name: string;
        quantity: number;
        price: number;
        item_type: "product" | "service";
        fee: number;
        line_total: number;
      }[]
    | null;
}): SaleRecord {
  const staff = Array.isArray(row.staff) ? row.staff[0] : row.staff;
  const voidedByStaff = Array.isArray(row.voided_by_staff) ? row.voided_by_staff[0] : row.voided_by_staff;
  const device = Array.isArray(row.device) ? row.device[0] : row.device;
  return {
    id: row.id,
    // occurred_at (set only for a sale that was queued offline and synced
    // later) reflects when the sale actually happened, not when it landed
    // in Postgres — falls back to created_at for a normal live sale.
    timestamp: row.occurred_at ?? row.created_at,
    total: row.total,
    cashierName: staff?.name ?? "Unknown",
    cashierId: staff?.id ?? null,
    paymentType: row.payment_type,
    customerId: row.customer_id,
    referenceNo: row.reference_no,
    receiptNumber: row.receipt_number,
    status: row.status,
    voidedAt: row.voided_at,
    voidedByName: voidedByStaff?.name ?? null,
    voidReason: row.void_reason,
    vatStatus: row.vat_status,
    vatRate: row.vat_rate,
    vatableSales: row.vatable_sales,
    vatAmount: row.vat_amount,
    vatExemptSales: row.vat_exempt_sales,
    zeroRatedSales: row.zero_rated_sales,
    deviceId: device?.id ?? null,
    deviceName: device?.name ?? null,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    discountAmount: row.discount_amount,
    items: (row.sale_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id ?? "",
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      itemType: item.item_type,
      fee: item.fee,
      lineTotal: item.line_total,
    })),
  };
}

/** Capped at 100 for the Dashboard. Reports uses listSalesInRange instead. */
export async function listRecentSales(limit = 100): Promise<SaleRecord[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapSaleRow);
}

/**
 * Server-side date range with optional cashier and device filters, for the
 * Reports page. Deliberately independent of listRecentSales, whose 100-row cap
 * would silently truncate a report over a full month.
 */
export async function listSalesInRange(params: {
  startDate: string;
  endDate: string;
  cashierId?: string | null;
  deviceId?: string | null;
  limit?: number;
}): Promise<SaleRecord[]> {
  let query = supabase
    .from("sales")
    .select(SALE_SELECT)
    .gte("created_at", params.startDate)
    .lte("created_at", params.endDate)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 1000);
  if (params.cashierId) query = query.eq("cashier_id", params.cashierId);
  if (params.deviceId) query = query.eq("device_id", params.deviceId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapSaleRow);
}

export { SALE_SELECT, mapSaleRow };
