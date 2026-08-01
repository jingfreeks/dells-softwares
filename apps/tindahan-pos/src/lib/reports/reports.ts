import { lowStockProducts } from "@/lib/inventory";
import type { Product, SaleRecord } from "@/lib/types";

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
export function salesByCategory(sales: SaleRecord[], products: Product[]): SalesByCategory {
  const categoryByProductId = new Map(products.map((p) => [p.id, p.category]));
  const totals = new Map<string, number>();

  for (const sale of sales) {
    for (const item of sale.items) {
      const category =
        item.itemType === "service"
          ? SERVICES_CATEGORY
          : (categoryByProductId.get(item.productId) ?? OTHER_CATEGORY);
      // Falls back to the pre-line_total formula if a row somehow arrives
      // without it (e.g. a client build running ahead of migration 0005),
      // so a schema/deploy-order mismatch degrades to a slightly-imprecise
      // total instead of NaN-ing the whole category.
      const amount = item.lineTotal ?? item.quantity * item.price + item.fee;
      totals.set(category, (totals.get(category) ?? 0) + amount);
    }
  }

  const rows = Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return { rows, grandTotal };
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
  name: string;
  quantity: number;
}

/** Top-selling products by units sold across the given sales, highest first. */
export function bestSellers(sales: SaleRecord[], limit = 5): BestSeller[] {
  const counts = new Map<string, BestSeller>();
  for (const sale of sales) {
    for (const item of sale.items) {
      if (item.itemType !== "product") continue;
      const entry = counts.get(item.productId) ?? { name: item.name, quantity: 0 };
      entry.quantity += item.quantity;
      counts.set(item.productId, entry);
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export interface DailyReport {
  generatedAt: string;
  todaysSalesTotal: number;
  todaysTransactionCount: number;
  totalProducts: number;
  lowStock: Product[];
  bestSellers: BestSeller[];
  recentSales: SaleRecord[];
}

/**
 * Single source of truth for the admin "Daily report" — both the
 * dashboard cards and the PDF export are built from this, so the two
 * can never drift apart.
 */
export function buildDailyReport(
  products: Product[],
  sales: SaleRecord[],
  now: Date = new Date()
): DailyReport {
  const todaysSales = sales.filter((s) => isToday(s.timestamp, now));
  return {
    generatedAt: now.toISOString(),
    todaysSalesTotal: todaysSales.reduce((sum, s) => sum + s.total, 0),
    todaysTransactionCount: todaysSales.length,
    totalProducts: products.length,
    lowStock: lowStockProducts(products),
    bestSellers: bestSellers(sales),
    recentSales: sales.slice(0, 10),
  };
}
