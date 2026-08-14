import type { ReceivingEntry } from "@/lib/storeData";
import type { Product, Supplier, SupplierPaymentTerms } from "@/lib/types";

/** ISO-8601 weekday number for a date: 1=Monday..7=Sunday. */
export function isoWeekday(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

/**
 * The next ISO weekday (1=Mon..7=Sun) this supplier is expected to
 * deliver, wrapping to next week when every delivery day this week has
 * already passed. Null when the supplier has no delivery days set.
 */
export function nextExpectedDelivery(usualDeliveryDays: number[], from: Date = new Date()): number | null {
  if (usualDeliveryDays.length === 0) return null;
  const today = isoWeekday(from);
  const sorted = [...usualDeliveryDays].sort((a, b) => a - b);
  return sorted.find((day) => day >= today) ?? sorted[0];
}

/** When a term-based delivery is due; null for cash (paid on delivery, nothing owed). */
export function supplierDueDate(receivedOn: string, paymentTerms: SupplierPaymentTerms): string | null {
  if (paymentTerms === "cash") return null;
  const days = paymentTerms === "7_days" ? 7 : 15;
  const due = new Date(receivedOn);
  due.setDate(due.getDate() + days);
  return due.toISOString().slice(0, 10);
}

function entryTotal(entry: ReceivingEntry): number {
  return entry.lines.reduce((sum, line) => sum + line.quantity * line.costEach, 0);
}

/** Total cost of deliveries from this supplier on or after `sinceDate`. */
export function supplierSpend(receivingHistory: ReceivingEntry[], supplierId: string, sinceDate: string): number {
  return receivingHistory
    .filter((entry) => entry.supplierId === supplierId && entry.date >= sinceDate)
    .reduce((sum, entry) => sum + entryTotal(entry), 0);
}

/** Total cost of this supplier's deliveries that haven't been marked paid yet. */
export function supplierUnpaidTotal(receivingHistory: ReceivingEntry[], supplierId: string): number {
  return receivingHistory
    .filter((entry) => entry.supplierId === supplierId && !entry.paid)
    .reduce((sum, entry) => sum + entryTotal(entry), 0);
}

/** Number of deliveries from this supplier on or after `sinceDate`. */
export function deliveryCount(receivingHistory: ReceivingEntry[], supplierId: string, sinceDate: string): number {
  return receivingHistory.filter((entry) => entry.supplierId === supplierId && entry.date >= sinceDate).length;
}

/** Most recent delivery date from this supplier, or null if there's never been one. */
export function lastDeliveryDate(receivingHistory: ReceivingEntry[], supplierId: string): string | null {
  const dates = receivingHistory.filter((entry) => entry.supplierId === supplierId).map((entry) => entry.date);
  if (dates.length === 0) return null;
  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

export interface SupplierCostChangeRow {
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  previousCost: number;
  newCost: number;
  /** Margin at the new cost against the product's current selling price; null if the product no longer exists or has no price. */
  marginPercent: number | null;
}

/**
 * Detects real cost changes from the two most recent deliveries of the
 * same product from the same supplier — never fabricated, and silent
 * when a product has fewer than two deliveries to compare.
 */
export function costChangesWorthKnowing(
  receivingHistory: ReceivingEntry[],
  products: Product[],
  suppliers: Supplier[],
  limit = 3
): SupplierCostChangeRow[] {
  const bySupplierProduct = new Map<string, { date: string; costEach: number; productName: string }[]>();
  for (const entry of receivingHistory) {
    if (!entry.supplierId) continue;
    for (const line of entry.lines) {
      const key = `${entry.supplierId}::${line.productId}`;
      const list = bySupplierProduct.get(key) ?? [];
      list.push({ date: entry.date, costEach: line.costEach, productName: line.productName });
      bySupplierProduct.set(key, list);
    }
  }

  const rows: SupplierCostChangeRow[] = [];
  for (const [key, deliveries] of bySupplierProduct) {
    if (deliveries.length < 2) continue;
    const [supplierId, productId] = key.split("::");
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) continue;
    const [latest, previous] = [...deliveries].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (latest.costEach === previous.costEach) continue;
    const product = products.find((p) => p.id === productId);
    const marginPercent =
      product && product.price > 0 ? Math.round(((product.price - latest.costEach) / product.price) * 100) : null;
    rows.push({
      productId,
      productName: latest.productName,
      supplierId,
      supplierName: supplier.name,
      previousCost: previous.costEach,
      newCost: latest.costEach,
      marginPercent,
    });
  }

  return rows
    .sort((a, b) => Math.abs(b.newCost - b.previousCost) - Math.abs(a.newCost - a.previousCost))
    .slice(0, limit);
}

/**
 * Case-insensitive exact/substring match only — not true fuzzy matching.
 * Good enough to catch "Mega Distribution" vs "mega distribution" or
 * "Mega Distributions" without inventing matching heuristics the app
 * doesn't otherwise have.
 */
export function findSimilarSupplierName(suppliers: Supplier[], name: string): Supplier | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  return (
    suppliers.find((s) => {
      const existing = s.name.trim().toLowerCase();
      return existing === normalized || existing.includes(normalized) || normalized.includes(existing);
    }) ?? null
  );
}
