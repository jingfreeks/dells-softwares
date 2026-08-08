import type { Product, SaleRecord, Customer } from "./types";

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
    ["Sale ID", "Date", "Cashier", "Payment type", "Reference no.", "Items", "Total"],
    sales.map((s) => [
      s.id,
      s.timestamp,
      s.cashierName,
      s.paymentType,
      s.referenceNo,
      s.items.map((item) => `${item.name} x${item.quantity}`).join("; "),
      s.total,
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
