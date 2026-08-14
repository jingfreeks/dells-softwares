import { lowStockProducts, computeRestockSuggestions, type RestockSuggestion } from "@/lib/inventory";
import type { Customer, Product, SaleRecord } from "@/lib/types";

/**
 * A voided sale (BIR compliance §39) had its stock/utang effects reversed
 * by void_sale() — it must never be counted in a revenue/quantity total
 * again, even though the row itself is kept (and still shown, with a
 * status badge) in list/table views like the Reports Sales table. Every
 * aggregating function below filters through this first; callers that
 * need the full list for display use the raw `sales` array unfiltered.
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
 * Sales income grouped by category (story E5), sorted highest first.
 * Service line items (story E3) are grouped under "Services" regardless
 * of product category. A product item whose product has since been
 * deleted (categoryByProductId has no entry) falls back to "Other"
 * rather than vanishing from the total.
 */
export function salesByCategory(
  sales: SaleRecord[],
  products: Product[]
): SalesByCategory {
  const categoryByProductId = new Map(
    products.map(({ id, category }) => [id, category])
  );

  const totals = new Map<string, number>();

  for (const item of completedSales(sales).flatMap(({ items }) => items)) {
      const category =
        item.itemType === "service"
          ? SERVICES_CATEGORY
          : categoryByProductId.get(item.productId) ?? OTHER_CATEGORY;

      const amount =
        item.lineTotal ?? item.quantity * item.price + item.fee;

      totals.set(category, (totals.get(category) ?? 0) + amount);
  }

  const rows = Array.from(totals, ([category, total]) => ({ category, total })).sort(
    (a, b) => b.total - a.total
  );
  return { rows, grandTotal: rows.reduce((sum, row) => sum + row.total, 0) };
}

export interface CategoryTotalWithPercent extends CategoryTotal {
  /** Share of grandTotal, 0-1. 0 when grandTotal is 0 (nothing to divide). */
  percent: number;
}

/** Adds each row's share of the grand total — used by the Sales by Category export sheet and detail views. */
export function withCategoryPercentages(categoryTotals: SalesByCategory): CategoryTotalWithPercent[] {
  const { rows, grandTotal } = categoryTotals;
  return rows.map((row) => ({ ...row, percent: grandTotal > 0 ? row.total / grandTotal : 0 }));
}

/** True if the given ISO timestamp falls on the same calendar day as `now` (local time). */
export function isToday(isoString: string, now: Date = new Date()): boolean {
  const d = new Date(isoString);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export interface BestSeller {
  productId: string;
  name: string;
  barcode: string | null;
  category: string;
  quantity: number;
  /** Sum of lineTotal across every line selling this product. */
  revenue: number;
  /** Number of distinct sales containing this product at least once. */
  transactionCount: number;
}

/**
 * Top-selling products by units sold across the given sales, highest
 * first. `products` resolves each item's barcode/category — a product
 * item whose product has since been deleted falls back to "Other"
 * (matching salesByCategory's convention) with no barcode.
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
        current.revenue += item.lineTotal ?? item.quantity * item.price + item.fee;
      } else {
        counts.set(item.productId, {
          productId: item.productId,
          name: item.name,
          barcode: product?.barcode ?? null,
          category: product?.category ?? OTHER_CATEGORY,
          quantity: item.quantity,
          revenue: item.lineTotal ?? item.quantity * item.price + item.fee,
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

export interface DailyReport {
  generatedAt: string;
  todaysSalesTotal: number;
  todaysTransactionCount: number;
  /** Percent change vs. the previous day's total. Null when the previous
   * day had no sales at all — a percentage against zero is undefined,
   * not "infinite growth". */
  salesChangePercent: number | null;
  utangOutstanding: number;
  lowStock: Product[];
  bestSellers: BestSeller[];
  recentSales: SaleRecord[];
  restockSuggestions: RestockSuggestion[];
  categoryTotals: SalesByCategory;
}

export interface CashierTotal {
  cashierId: string | null;
  cashierName: string;
  total: number;
  transactionCount: number;
}

export interface RangeReport {
  totalSales: number;
  transactionCount: number;
  averageSale: number;
  byCashier: CashierTotal[];
  bestSellers: BestSeller[];
  categoryTotals: SalesByCategory;
  sales: SaleRecord[];
}

/** Per-cashier sales totals for the given sales, highest total first. */
export function salesByCashier(sales: SaleRecord[]): CashierTotal[] {
  const totals = new Map<string | null, CashierTotal>();

  for (const sale of completedSales(sales)) {
    const key = sale.cashierId;
    const current = totals.get(key);
    if (current) {
      current.total += sale.total;
      current.transactionCount += 1;
    } else {
      totals.set(key, {
        cashierId: sale.cashierId,
        cashierName: sale.cashierName,
        total: sale.total,
        transactionCount: 1,
      });
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

/**
 * Sales summary for an arbitrary date range and optional cashier filter —
 * the Reports page's equivalent of `buildDailyReport`, minus the
 * today-vs-yesterday framing (the caller has already filtered `sales` to
 * the desired range before calling this).
 */
export function buildRangeReport(sales: SaleRecord[], products: Product[]): RangeReport {
  const completed = completedSales(sales);
  const totalSales = completed.reduce((sum, s) => sum + s.total, 0);
  const transactionCount = completed.length;

  return {
    totalSales,
    transactionCount,
    averageSale: transactionCount > 0 ? totalSales / transactionCount : 0,
    byCashier: salesByCashier(completed),
    bestSellers: bestSellers(completed, products),
    categoryTotals: salesByCategory(completed, products),
    // Unfiltered — the Reports Sales table and CSV export show every row,
    // voided included (with a status badge), only the numbers above exclude it.
    sales,
  };
}

/**
 * Single source of truth for the admin "Daily report" — the dashboard
 * cards, its detail modals, and the Excel export are all built from
 * this, so none of them can drift apart.
 *
 * `daySales`/`previousDaySales` must already be scoped to the selected
 * reporting day and the day before it (e.g. via `fetchSalesInRange`) —
 * this function no longer filters by date itself. `recentSales` is a
 * separately-scoped, broader window (unrelated to the selected day)
 * used only to project restock suggestions, since "what to restock" is
 * about current inventory planning, not a historical day's report.
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
