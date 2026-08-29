import type { Product, SaleRecord, Customer, RefundRecord } from "./types";
import { completedSales } from "./reports";
import type { PaymentTypeTotal } from "./reports";

/** Wraps a field in double quotes (doubling any embedded quotes) if it contains a comma, quote, or newline. */
function csvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvField).join(","), ...rows.map((row) => row.map(csvField).join(","))];
  return lines.join("\r\n");
}

export function productsToCsv(products: Product[]): string {
  return toCsv(
    ["Name", "Barcode", "Category", "Price", "Stock", "Low stock threshold", "Pack quantity", "Pack price"],
    products.map((p) => [p.name, p.barcode, p.category, p.price, p.stock, p.lowStockThreshold, p.packQuantity, p.packPrice])
  );
}

export function salesToCsv(sales: SaleRecord[]): string {
  return toCsv(
    [
      "Sale ID",
      "Date",
      "Receipt No.",
      "Cashier",
      "Payment type",
      "Reference no.",
      "Items",
      "Total",
      "Status",
      "Void reason",
      "VAT status",
      "Vatable sales",
      "VAT amount",
      "VAT-exempt sales",
      "Zero-rated sales",
      "Discount type",
      "Discount value",
      "Discount amount",
    ],
    sales.map((s) => [
      s.id,
      s.timestamp,
      s.receiptNumber,
      s.cashierName,
      s.paymentType,
      s.referenceNo,
      s.items.map((item) => `${item.name} x${item.quantity}`).join("; "),
      s.total,
      s.status,
      s.voidReason,
      s.vatStatus,
      s.vatableSales,
      s.vatAmount,
      s.vatExemptSales,
      s.zeroRatedSales,
      s.discountType,
      s.discountValue,
      s.discountAmount,
    ])
  );
}

/** BIR compliance §50: a standalone VAT sales report, not just the summary
 * tiles — one row per completed sale with its VAT breakdown. */
export function vatSalesToCsv(sales: SaleRecord[]): string {
  return toCsv(
    ["Sale ID", "Date", "Receipt No.", "VAT status", "Vatable sales", "VAT amount", "VAT-exempt sales", "Zero-rated sales", "Total"],
    completedSales(sales).map((s) => [
      s.id,
      s.timestamp,
      s.receiptNumber,
      s.vatStatus,
      s.vatableSales,
      s.vatAmount,
      s.vatExemptSales,
      s.zeroRatedSales,
      s.total,
    ])
  );
}

/** BIR compliance §39: a standalone void/cancelled-transactions report. */
export function voidsToCsv(sales: SaleRecord[]): string {
  const voided = sales.filter((s) => s.status === "voided");
  return toCsv(
    ["Sale ID", "Date", "Receipt No.", "Cashier", "Total", "Voided at", "Voided by", "Void reason"],
    voided.map((s) => [s.id, s.timestamp, s.receiptNumber, s.cashierName, s.total, s.voidedAt, s.voidedByName, s.voidReason])
  );
}

/** Refunds are never reflected on the original sale (append-only, see
 * RefundRecord) -- this is the only place their total is reported at all. */
export function refundsToCsv(refunds: RefundRecord[]): string {
  return toCsv(
    ["Refund ID", "Date", "Sale receipt no.", "Cashier", "Amount", "Reason"],
    refunds.map((r) => [r.id, r.createdAt, r.receiptNumber, r.cashierName, r.totalAmount, r.reason])
  );
}

export function paymentBreakdownToCsv(rows: PaymentTypeTotal[]): string {
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  return toCsv(
    ["Payment type", "Transactions", "Total", "% of total"],
    rows.map((row) => [
      row.paymentType,
      row.transactionCount,
      row.total,
      grandTotal > 0 ? `${Math.round((row.total / grandTotal) * 100)}%` : "0%",
    ])
  );
}

export function everythingToJson(data: { products: Product[]; sales: SaleRecord[]; customers: Customer[] }): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2);
}

/** Triggers a browser download of `content` as a file named `filename`, without navigating away from the page. */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
