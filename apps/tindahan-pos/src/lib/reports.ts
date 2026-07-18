import type { Product, SaleRecord } from "./types";

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
      const amount = item.quantity * item.price + item.fee;
      totals.set(category, (totals.get(category) ?? 0) + amount);
    }
  }

  const rows = Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return { rows, grandTotal };
}
