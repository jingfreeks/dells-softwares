import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Customer, Product, SaleRecord } from "./types";

/**
 * CSV/JSON serialization ported from apps/tindahan-pos/src/lib/csvExport.ts,
 * with one deliberate difference: the columns are only the ones mobile's
 * own `SaleRecord` actually carries. The web app's sales export also has
 * receipt numbers, VAT breakdowns, void reasons and discounts, none of
 * which exist on this client's type -- emitting them as empty columns
 * would suggest the data was exported and turned out blank.
 */

/** Wraps a field in double quotes (doubling any embedded quotes) if it contains a comma, quote, or newline. */
function csvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.map(csvField).join(","), ...rows.map((row) => row.map(csvField).join(","))].join("\r\n");
}

export function productsToCsv(products: Product[]): string {
  return toCsv(
    ["Name", "Barcode", "Category", "Price", "Stock", "Low stock threshold", "Pack quantity", "Pack price"],
    products.map((p) => [
      p.name,
      p.barcode,
      p.category,
      p.price,
      p.stock,
      p.lowStockThreshold,
      p.packQuantity,
      p.packPrice,
    ])
  );
}

export function salesToCsv(sales: SaleRecord[]): string {
  return toCsv(
    ["Sale ID", "Date", "Cashier", "Payment type", "Reference no.", "Items", "Total", "Status"],
    sales.map((s) => [
      s.id,
      s.timestamp,
      s.cashierName,
      s.paymentType,
      s.referenceNo,
      s.items.map((item) => `${item.name} x${item.quantity}`).join("; "),
      s.total,
      s.status,
    ])
  );
}

export function customersToCsv(customers: Customer[]): string {
  return toCsv(
    ["Name", "Phone", "Credit limit", "Balance"],
    customers.map((c) => [c.name, c.phone, c.creditLimit, c.balance])
  );
}

export function everythingToJson(data: {
  products: Product[];
  sales: SaleRecord[];
  customers: Customer[];
}): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2);
}

/** `sales-2026-08-31.csv` -- the date is what makes two exports tellable apart in the share target. */
export function exportFileName(prefix: string, extension: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

/**
 * The mobile equivalent of the web app's `downloadTextFile`: there is no
 * browser download, so the file is written to the cache directory and
 * handed to the OS share sheet, which is where the operator picks Files,
 * Mail, Drive or anything else that accepts it.
 *
 * Cache rather than documents on purpose -- the copy that matters is the
 * one the operator sends somewhere, and the system is free to reclaim the
 * staging file afterwards.
 */
export async function shareTextFile(filename: string, content: string, mimeType: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: mimeType === "text/csv" ? "public.comma-separated-values-text" : "public.json" });
}
