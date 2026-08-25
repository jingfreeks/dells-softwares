import { computeRestockSuggestions, lowStockProducts, type RestockSuggestion } from "./inventory";
import type { Customer, PaymentType, Product, SaleRecord } from "./types";

/**
 * A voided sale had its stock/utang effects reversed server-side — it must
 * never be counted in a revenue/quantity total again, even though the row
 * itself is kept (and can still be shown, with a status badge, in list
 * views). Every aggregating function below filters through this first;
 * callers that need the full list for display use the raw `sales` array
 * unfiltered. Ported from apps/tindahan-pos/src/lib/reports/reports.ts.
 */
export function completedSales(sales: SaleRecord[]): SaleRecord[] {
  return sales.filter((sale) => sale.status !== "voided");
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface SalesByCategory {
  rows: CategoryTotal[];
  grandTotal: number;
}

const SERVICES_CATEGORY = "Services";
const OTHER_CATEGORY = "Other";

/**
 * Sales income grouped by category, sorted highest first. Service line
 * items are grouped under "Services" regardless of product category. A
 * product item whose product has since been deleted falls back to "Other"
 * rather than vanishing from the total.
 */
export function salesByCategory(sales: SaleRecord[], products: Product[]): SalesByCategory {
  const categoryByProductId = new Map(products.map(({ id, category }) => [id, category]));

  const totals = new Map<string, number>();

  for (const item of completedSales(sales).flatMap(({ items }) => items)) {
    const category =
      item.itemType === "service" ? SERVICES_CATEGORY : categoryByProductId.get(item.productId) ?? OTHER_CATEGORY;

    totals.set(category, (totals.get(category) ?? 0) + item.lineTotal);
  }

  const rows = Array.from(totals, ([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  return { rows, grandTotal: rows.reduce((sum, row) => sum + row.total, 0) };
}

export interface CategoryTotalWithPercent extends CategoryTotal {
  /** Share of grandTotal, 0-1. 0 when grandTotal is 0 (nothing to divide). */
  percent: number;
}

/** Adds each row's share of the grand total. */
export function withCategoryPercentages(categoryTotals: SalesByCategory): CategoryTotalWithPercent[] {
  const { rows, grandTotal } = categoryTotals;
  return rows.map((row) => ({ ...row, percent: grandTotal > 0 ? row.total / grandTotal : 0 }));
}

export interface BestSeller {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  /** Sum of lineTotal across every line selling this product. */
  revenue: number;
  /** Number of distinct sales containing this product at least once. */
  transactionCount: number;
}

/**
 * Top-selling products by units sold across the given sales, highest
 * first. `products` resolves each item's category — a product item whose
 * product has since been deleted falls back to "Other" (matching
 * salesByCategory's convention).
 */
export function bestSellers(sales: SaleRecord[], products: Product[], limit = 5): BestSeller[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const counts = new Map<string, BestSeller>();
  const salesCountedByProduct = new Map<string, Set<string>>();

  for (const sale of completedSales(sales)) {
    for (const item of sale.items) {
      if (item.itemType !== "product") continue;
      const product = productById.get(item.productId);
      const current = counts.get(item.productId);
      if (current) {
        current.quantity += item.quantity;
        current.revenue += item.lineTotal;
      } else {
        counts.set(item.productId, {
          productId: item.productId,
          name: item.name,
          category: product?.category ?? OTHER_CATEGORY,
          quantity: item.quantity,
          revenue: item.lineTotal,
          transactionCount: 0,
        });
      }
      const seenSales = salesCountedByProduct.get(item.productId) ?? new Set<string>();
      seenSales.add(sale.id);
      salesCountedByProduct.set(item.productId, seenSales);
    }
  }

  for (const [productId, seenSales] of salesCountedByProduct) {
    const entry = counts.get(productId);
    if (entry) entry.transactionCount = seenSales.size;
  }

  return [...counts.values()].sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}

export interface PaymentTypeTotal {
  paymentType: PaymentType;
  total: number;
  transactionCount: number;
}

/** Per-payment-method sales totals for the given (already-completed) sales, highest total first. */
export function salesByPaymentType(sales: SaleRecord[]): PaymentTypeTotal[] {
  const totals = new Map<PaymentType, PaymentTypeTotal>();

  for (const sale of sales) {
    const current = totals.get(sale.paymentType);
    if (current) {
      current.total += sale.total;
      current.transactionCount += 1;
    } else {
      totals.set(sale.paymentType, { paymentType: sale.paymentType, total: sale.total, transactionCount: 1 });
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

export interface DailyReport {
  generatedAt: string;
  todaysSalesTotal: number;
  todaysTransactionCount: number;
  /** Percent change vs. the previous day's total. Null when the previous
   * day had no sales at all — a percentage against zero is undefined, not
   * "infinite growth". */
  salesChangePercent: number | null;
  utangOutstanding: number;
  lowStock: Product[];
  bestSellers: BestSeller[];
  recentSales: SaleRecord[];
  restockSuggestions: RestockSuggestion[];
  categoryTotals: SalesByCategory;
}

/**
 * Single source of truth for the Owner dashboard's "today" cards and
 * detail views, mirroring apps/tindahan-pos/src/lib/reports/reports.ts's
 * buildDailyReport (without its VAT/BIR fields — mobile's SaleRecord
 * doesn't carry those, and none of the Owner screens built so far need
 * them).
 *
 * `daySales`/`previousDaySales` must already be scoped to the selected
 * reporting day and the day before it. `recentSales` is a separately
 * scoped, broader window used only to project restock suggestions.
 */
export function buildDailyReport(
  products: Product[],
  daySales: SaleRecord[],
  previousDaySales: SaleRecord[],
  recentSales: SaleRecord[],
  customers: Customer[],
  reportDate: Date = new Date()
): DailyReport {
  const completedDaySales = completedSales(daySales);
  const completedPreviousDaySales = completedSales(previousDaySales);
  const todaysSalesTotal = completedDaySales.reduce((sum, s) => sum + s.total, 0);
  const previousDaySalesTotal = completedPreviousDaySales.reduce((sum, s) => sum + s.total, 0);

  return {
    generatedAt: reportDate.toISOString(),
    todaysSalesTotal,
    todaysTransactionCount: completedDaySales.length,
    salesChangePercent:
      previousDaySalesTotal > 0
        ? Math.round(((todaysSalesTotal - previousDaySalesTotal) / previousDaySalesTotal) * 100)
        : null,
    utangOutstanding: customers.reduce((sum, c) => sum + c.balance, 0),
    lowStock: lowStockProducts(products),
    bestSellers: bestSellers(completedDaySales, products),
    recentSales: completedDaySales.slice(0, 10),
    restockSuggestions: computeRestockSuggestions(products, completedSales(recentSales), { now: reportDate }),
    categoryTotals: salesByCategory(completedDaySales, products),
  };
}
