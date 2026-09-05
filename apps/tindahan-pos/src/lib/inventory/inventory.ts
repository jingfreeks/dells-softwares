import { PESO, roundMoney } from "@/lib/money";
import type { Product, SaleRecord, Supplier } from "@/lib/types";

export type StockStatus = "out" | "low" | "in-stock";

/**
 * Stock status for a product against its per-product low-stock threshold
 * (story B5 — threshold is settable per product).
 */
export function stockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return "out";
  if (product.stock <= product.lowStockThreshold) return "low";
  return "in-stock";
}

export function lowStockProducts(products: Product[]): Product[] {
  return products.filter((p) => stockStatus(p) !== "in-stock");
}

export function receiveStock(products: Product[], productId: string, quantity: number): Product[] {
  return products.map((p) =>
    p.id === productId ? { ...p, stock: p.stock + quantity } : p
  );
}

export function deductStockForSale(
  products: Product[],
  items: { productId: string; quantity: number }[]
): Product[] {
  return products.map((p) => {
    const sold = items.find((i) => i.productId === p.id);
    if (!sold) return p;
    return { ...p, stock: Math.max(0, p.stock - sold.quantity) };
  });
}

export interface ReceivingLine {
  productId: string;
  productName: string;
  quantity: number;
  costEach: number;
}

/** Total cost of a receiving entry (story E2 — "optionally cost"). */
export function receivingTotalCost(lines: ReceivingLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.costEach, 0);
}

/** Preview of a product's stock before/after a pending receiving line. */
export function stockPreview(
  products: Product[],
  productId: string,
  quantity: number
): { old: number; next: number } | null {
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  return { old: product.stock, next: product.stock + quantity };
}

/**
 * Effective per-unit price for a pack (e.g. 3 pcs for ₱5 → ₱1.67/pc).
 * products.price is always populated with this so every existing
 * price display keeps working unchanged; the pack fraction itself is
 * what checkout actually charges against (see lib/pos.ts lineTotal).
 */
export function packUnitPrice(packQuantity: number, packPrice: number): number {
  return roundMoney(packPrice / packQuantity);
}

/** A short label for pack-priced products, e.g. "3 pcs for ₱5.00". */
export function packPriceLabel(product: Product): string | null {
  if (product.packQuantity == null || product.packPrice == null) return null;
  return `${product.packQuantity} pcs for ${PESO.format(product.packPrice)}`;
}

/**
 * Find another product already using this barcode (story B1a — scanning a
 * barcode that already exists warns the admin instead of creating a
 * duplicate). Excludes the product currently being edited, if any.
 */
export function findDuplicateBarcode(
  products: Product[],
  barcode: string,
  excludeId: string | null
): Product | null {
  const trimmed = barcode.trim();
  if (!trimmed) return null;
  return products.find((p) => p.barcode === trimmed && p.id !== excludeId) ?? null;
}

const RESTOCK_LOOKBACK_DAYS = 30;
const RESTOCK_LEAD_TIME_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RestockSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  daysOfStockLeft: number;
  suggestedQuantity: number;
}

/**
 * Reorder point = how fast a product actually sells × how long a restock
 * takes to arrive, plus the product's own low-stock threshold as a safety
 * buffer. A product below that point gets a suggested quantity to bring it
 * back up to the point. Deliberately a plain formula, not a model — the
 * formula itself is the explanation a store owner sees.
 *
 * Only sales within `lookbackDays` count, and the average is taken over
 * however many days those sales actually span (not the full lookback
 * window) — a store with only a week of history shouldn't have its recent
 * sales diluted across 30 days it doesn't have data for yet.
 */
export function computeRestockSuggestions(
  products: Product[],
  sales: SaleRecord[],
  options: { lookbackDays?: number; leadTimeDays?: number; now?: Date } = {}
): RestockSuggestion[] {
  const lookbackDays = options.lookbackDays ?? RESTOCK_LOOKBACK_DAYS;
  const leadTimeDays = options.leadTimeDays ?? RESTOCK_LEAD_TIME_DAYS;
  const now = options.now ?? new Date();
  const windowStart = now.getTime() - lookbackDays * MS_PER_DAY;

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
      ? lookbackDays
      : Math.max(1, (now.getTime() - earliestSaleInWindow) / MS_PER_DAY);

  const suggestions: RestockSuggestion[] = [];
  for (const product of products) {
    const soldQuantity = soldQuantityByProduct.get(product.id) ?? 0;
    if (soldQuantity <= 0) continue;

    const avgDailySales = soldQuantity / spanDays;
    const reorderPoint = avgDailySales * leadTimeDays + product.lowStockThreshold;
    if (product.stock >= reorderPoint) continue;

    suggestions.push({
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      avgDailySales: Math.round(avgDailySales * 100) / 100,
      daysOfStockLeft: Math.round((product.stock / avgDailySales) * 10) / 10,
      suggestedQuantity: Math.ceil(reorderPoint - product.stock),
    });
  }

  return suggestions.sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft);
}

/** O(1) lookup index for findDuplicateBarcodeFast, memoize this per products list. */
export function buildBarcodeIndex(products: Product[]): Map<string, Product> {
  const index = new Map<string, Product>();
  for (const p of products) {
    if (p.barcode) index.set(p.barcode, p);
  }
  return index;
}

/**
 * Same contract as findDuplicateBarcode, but O(1) given a pre-built index
 * instead of scanning every product — use this for checks that run on
 * every keystroke (e.g. the barcode field's onChange).
 */
export function findDuplicateBarcodeFast(
  index: Map<string, Product>,
  barcode: string,
  excludeId: string | null
): Product | null {
  const trimmed = barcode.trim();
  if (!trimmed) return null;
  const match = index.get(trimmed);
  if (!match || match.id === excludeId) return null;
  return match;
}

export interface RestockRow {
  productId: string;
  productName: string;
  barcode: string | null;
  category: string;
  stock: number;
  minStock: number;
  isOut: boolean;
  avgDailySales: number | null;
  daysOfStockLeft: number | null;
  suggestedQuantity: number | null;
  /** Best-effort match on the supplier(s) declaring this product's category as something they supply — not a literal delivery record. Null when no active supplier claims the category. */
  supplier: string | null;
  /** Admin-entered cost estimate, if any — used only for "est. cost to refill", never fabricated when absent. */
  cost: number | null;
}

/**
 * Which products need attention, enriched with a rate where one can be
 * computed.
 *
 * `lowStock` is the source of truth for WHICH products qualify -- it includes
 * products with no recent sales, which computeRestockSuggestions deliberately
 * excludes because there is no rate to project from. The suggestion only
 * enriches a row when the data exists, so a product with an empty rate column
 * is honestly empty rather than silently missing from the list.
 *
 * Lifted here from the Dashboard page so Review can use it without importing
 * across pages: this is inventory arithmetic, not a Dashboard concern, and it
 * now has three consumers.
 */
export function buildRestockRows(
  lowStock: Product[],
  suggestions: RestockSuggestion[],
  suppliers: Supplier[]
): RestockRow[] {
  const suggestionByProductId = new Map(suggestions.map((s) => [s.productId, s]));

  return [...lowStock]
    .map((p) => {
      const suggestion = suggestionByProductId.get(p.id);
      const supplier = suppliers.find((s) => s.active && s.categoryIds.includes(p.categoryId));
      return {
        productId: p.id,
        productName: p.name,
        barcode: p.barcode,
        category: p.category,
        stock: p.stock,
        minStock: p.lowStockThreshold,
        isOut: p.stock <= 0,
        avgDailySales: suggestion?.avgDailySales ?? null,
        daysOfStockLeft: suggestion?.daysOfStockLeft ?? null,
        suggestedQuantity: suggestion?.suggestedQuantity ?? null,
        supplier: supplier?.name ?? null,
        cost: p.cost,
      };
    })
    .sort((a, b) => {
      if (a.isOut !== b.isOut) return a.isOut ? -1 : 1;
      const aDays = a.daysOfStockLeft ?? Infinity;
      const bDays = b.daysOfStockLeft ?? Infinity;
      return aDays - bDays;
    });
}
