import type { Product, ReceivingEntry, SaleRecord } from "@/lib";
import {
  TEXT_TODAY_LOWER,
  TEXT_YESTERDAY_LOWER,
  TEXT_DAYS_AGO_SUFFIX,
  LABEL_NO_BARCODE,
  TEXT_LEFT_SUFFIX,
  TEXT_SELLS_PREFIX,
  TEXT_PER_DAY_SUFFIX,
  TEXT_OUT_IN_PREFIX,
  TEXT_HRS_SUFFIX,
  TEXT_DAY_SINGULAR,
  TEXT_DAYS_SUFFIX,
} from "@/lib";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Shortens a barcode for the table row, e.g. "4800016123456" -> "4800016…". */
export function truncateBarcode(barcode: string | null, maxChars = 7): string {
  if (!barcode) return LABEL_NO_BARCODE;
  return barcode.length > maxChars ? `${barcode.slice(0, maxChars)}…` : barcode;
}

/**
 * Weighted-average cost per unit from every receiving line for this
 * product, across all receiving history. Null when the product has
 * never been received (no cost data exists for it).
 */
export function productAverageCost(receivingHistory: ReceivingEntry[], productId: string): number | null {
  let totalQuantity = 0;
  let totalCost = 0;
  for (const entry of receivingHistory) {
    for (const line of entry.lines) {
      if (line.productId !== productId) continue;
      totalQuantity += line.quantity;
      totalCost += line.quantity * line.costEach;
    }
  }
  return totalQuantity > 0 ? totalCost / totalQuantity : null;
}

/** Profit margin as a percent of selling price. Null when there's no cost basis yet. */
export function productMarginPercent(product: Product, receivingHistory: ReceivingEntry[]): number | null {
  if (product.price <= 0) return null;
  const avgCost = productAverageCost(receivingHistory, product.id);
  if (avgCost === null) return null;
  return Math.round(((product.price - avgCost) / product.price) * 100);
}

/** Mean margin across every product with known cost data; 0 when none do. */
export function averageMarginPercent(products: Product[], receivingHistory: ReceivingEntry[]): number {
  const margins = products
    .map((p) => productMarginPercent(p, receivingHistory))
    .filter((m): m is number => m !== null);
  if (margins.length === 0) return 0;
  return Math.round(margins.reduce((sum, m) => sum + m, 0) / margins.length);
}

/** Total stock value at cost, falling back to selling price for products with no cost data yet. */
export function stockValueAtCost(products: Product[], receivingHistory: ReceivingEntry[]): number {
  return products.reduce((sum, product) => {
    const cost = productAverageCost(receivingHistory, product.id) ?? product.price;
    return sum + cost * product.stock;
  }, 0);
}

const SALES_LOOKBACK_DAYS = 30;

/**
 * Average units sold per day, per product, over the lookback window —
 * for every product with recent sales (unlike computeRestockSuggestions,
 * which only returns products already below their reorder point).
 */
export function computeDailySalesRates(
  products: Product[],
  sales: SaleRecord[],
  now: Date = new Date()
): Map<string, number> {
  const windowStart = now.getTime() - SALES_LOOKBACK_DAYS * MS_PER_DAY;
  const soldQuantityByProduct = new Map<string, number>();
  let earliestSaleInWindow: number | null = null;

  for (const sale of sales) {
    const saleTime = new Date(sale.timestamp).getTime();
    if (saleTime < windowStart) continue;
    if (earliestSaleInWindow === null || saleTime < earliestSaleInWindow) {
      earliestSaleInWindow = saleTime;
    }
    for (const item of sale.items) {
      if (item.itemType !== "product" || !item.productId) continue;
      soldQuantityByProduct.set(
        item.productId,
        (soldQuantityByProduct.get(item.productId) ?? 0) + item.quantity
      );
    }
  }

  const spanDays =
    earliestSaleInWindow === null
      ? SALES_LOOKBACK_DAYS
      : Math.max(1, (now.getTime() - earliestSaleInWindow) / MS_PER_DAY);

  const rates = new Map<string, number>();
  for (const product of products) {
    const soldQuantity = soldQuantityByProduct.get(product.id);
    if (soldQuantity) rates.set(product.id, soldQuantity / spanDays);
  }
  return rates;
}

/** "12 left · out in ~3 days" style caption for the stock column. */
export function stockEtaCaption(product: Product, avgDailySales: number | undefined): string {
  if (product.stock <= 0) {
    return avgDailySales
      ? `0 ${TEXT_LEFT_SUFFIX} · ${TEXT_SELLS_PREFIX}${Math.round(avgDailySales)}${TEXT_PER_DAY_SUFFIX}`
      : `0 ${TEXT_LEFT_SUFFIX}`;
  }
  if (!avgDailySales) return `${product.stock} ${TEXT_LEFT_SUFFIX}`;

  const days = product.stock / avgDailySales;
  const eta =
    days < 1
      ? `${Math.max(1, Math.round(days * 24))} ${TEXT_HRS_SUFFIX}`
      : `${Math.round(days)} ${days < 2 ? TEXT_DAY_SINGULAR : TEXT_DAYS_SUFFIX}`;
  return `${product.stock} ${TEXT_LEFT_SUFFIX} · ${TEXT_OUT_IN_PREFIX}${eta}`;
}

/** "2 days ago" style label for the most recent receiving entry's date, or null if there's none yet. */
export function lastStockInLabel(receivingHistory: ReceivingEntry[], now: Date = new Date()): string | null {
  if (receivingHistory.length === 0) return null;
  const mostRecent = receivingHistory.reduce((latest, entry) =>
    new Date(entry.date).getTime() > new Date(latest.date).getTime() ? entry : latest
  );
  const diffDays = Math.round((now.getTime() - new Date(mostRecent.date).getTime()) / MS_PER_DAY);
  if (diffDays <= 0) return TEXT_TODAY_LOWER;
  if (diffDays === 1) return TEXT_YESTERDAY_LOWER;
  return `${diffDays} ${TEXT_DAYS_AGO_SUFFIX}`;
}
