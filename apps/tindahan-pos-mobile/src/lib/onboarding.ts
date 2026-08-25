import type { Product, SaleRecord } from "./types";

/**
 * A curated starter list of common sari-sari store items, grouped by
 * category, with typical retail prices a new store can adjust later.
 * Ported verbatim from apps/tindahan-pos/src/pages/Onboarding/starterCatalog.ts.
 * No barcodes -- real UPC/EAN codes aren't something we can source here.
 */
export interface StarterCatalogItem {
  name: string;
  price: number;
}

export interface StarterCatalogCategory {
  key: string;
  label: string;
  items: StarterCatalogItem[];
}

export const STARTER_CATALOG: StarterCatalogCategory[] = [
  {
    key: "noodles",
    label: "Noodles",
    items: [
      { name: "Lucky Me Pancit Canton", price: 18 },
      { name: "Lucky Me Instant Mami", price: 12 },
      { name: "Payless Instant Noodles", price: 8 },
      { name: "Nissin Cup Noodles", price: 25 },
      { name: "Lucky Me Beef na Beef", price: 12 },
      { name: "Quickchow Sotanghon", price: 10 },
    ],
  },
  {
    key: "drinks",
    label: "Drinks",
    items: [
      { name: "Coke Sakto 200ml", price: 20 },
      { name: "Sprite Sakto 200ml", price: 20 },
      { name: "Royal Sakto 200ml", price: 20 },
      { name: "C2 Green Tea", price: 20 },
      { name: "Nescafe 3-in-1", price: 8 },
      { name: "Kopiko Brown", price: 8 },
      { name: "Milo Sachet", price: 10 },
      { name: "Gatorade", price: 30 },
    ],
  },
  {
    key: "snacks",
    label: "Snacks",
    items: [
      { name: "Skyflakes Crackers", price: 9 },
      { name: "Piattos", price: 15 },
      { name: "Nova Multigrain", price: 15 },
      { name: "Chippy", price: 15 },
      { name: "Boy Bawang", price: 12 },
      { name: "Clover Chips", price: 12 },
      { name: "Maxx Candy", price: 1 },
      { name: "Storck Chox", price: 5 },
      { name: "Choc Nut", price: 6 },
    ],
  },
  {
    key: "canned",
    label: "Canned Goods",
    items: [
      { name: "Century Tuna Flakes in Oil", price: 28 },
      { name: "555 Sardines", price: 22 },
      { name: "Argentina Corned Beef", price: 35 },
      { name: "Ligo Sardines", price: 20 },
      { name: "Purefoods Corned Beef", price: 40 },
      { name: "Del Monte Pineapple Juice", price: 45 },
    ],
  },
  {
    key: "household",
    label: "Household",
    items: [
      { name: "Tide Bar 125g", price: 24 },
      { name: "Safeguard Soap", price: 20 },
      { name: "Palmolive Shampoo Sachet", price: 8 },
      { name: "Downy Sachet", price: 8 },
      { name: "Joy Dishwashing Liquid Sachet", price: 8 },
      { name: "Colgate Toothpaste Small", price: 22 },
    ],
  },
  {
    key: "sachets",
    label: "Sachets",
    items: [
      { name: "Bear Brand Powdered Milk", price: 33 },
      { name: "Alaska Condensada", price: 15 },
      { name: "Datu Puti Vinegar Sachet", price: 5 },
      { name: "Silver Swan Soy Sauce Sachet", price: 5 },
      { name: "Knorr Sinigang Mix", price: 8 },
      { name: "Ajinomoto Sachet", price: 5 },
    ],
  },
];

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type OnboardingStep = "welcome" | "profile" | "products" | "stockAlerts" | "openRegister" | "done";

const STEP_ORDER: OnboardingStep[] = ["welcome", "profile", "products", "stockAlerts", "openRegister", "done"];
const TOTAL_ESTIMATED_MINUTES = 8;

/** Ported from apps/tindahan-pos/src/pages/Onboarding/lib.ts. */
export function onboardingProgressPercent(step: OnboardingStep): number {
  const index = STEP_ORDER.indexOf(step);
  return Math.round((index / (STEP_ORDER.length - 1)) * 100);
}

export function onboardingMinutesLeft(step: OnboardingStep): number {
  const percent = onboardingProgressPercent(step);
  return Math.max(1, Math.round(TOTAL_ESTIMATED_MINUTES * (1 - percent / 100)));
}

const SALES_LOOKBACK_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Average units sold per day, per product, over the last 30 days (or
 * however many days of history actually exist within that window).
 * Ported from apps/tindahan-pos/src/pages/Inventory/lib.ts
 * computeDailySalesRates -- kept here rather than in inventory.ts since
 * it's onboarding-preview-only for now.
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
      soldQuantityByProduct.set(item.productId, (soldQuantityByProduct.get(item.productId) ?? 0) + item.quantity);
    }
  }

  const spanDays =
    earliestSaleInWindow === null ? SALES_LOOKBACK_DAYS : Math.max(1, (now.getTime() - earliestSaleInWindow) / MS_PER_DAY);

  const rates = new Map<string, number>();
  for (const product of products) {
    const soldQuantity = soldQuantityByProduct.get(product.id);
    if (!soldQuantity) continue;
    rates.set(product.id, soldQuantity / spanDays);
  }
  return rates;
}

export const MIN_THRESHOLD_DAYS = 1;
export const MAX_THRESHOLD_DAYS = 7;
export const DEFAULT_THRESHOLD_DAYS = 3;

const FAST_MOVER_DAILY_SALES = 10;
const FAST_MOVER_THRESHOLD_DAYS = 5;

export interface StockAlertPreviewItem {
  productId: string;
  productName: string;
  daysOfStockLeft: number;
}

export interface StockAlertPreview {
  affectedCount: number;
  items: StockAlertPreviewItem[];
}

/**
 * Previews which products would trigger a "days of cover" alert under
 * the given threshold. Ported from apps/tindahan-pos/src/pages/Onboarding/lib.ts.
 */
export function computeStockAlertPreview(
  products: Product[],
  sales: SaleRecord[],
  thresholdDays: number,
  fastMoverBoost: boolean,
  now: Date = new Date()
): StockAlertPreview {
  const dailySalesRates = computeDailySalesRates(products, sales, now);
  const items: StockAlertPreviewItem[] = [];

  for (const product of products) {
    if (product.stock <= 0) {
      items.push({ productId: product.id, productName: product.name, daysOfStockLeft: 0 });
      continue;
    }
    const avgDailySales = dailySalesRates.get(product.id);
    if (!avgDailySales) continue;
    const effectiveThresholdDays =
      fastMoverBoost && avgDailySales >= FAST_MOVER_DAILY_SALES ? FAST_MOVER_THRESHOLD_DAYS : thresholdDays;
    const daysOfStockLeft = product.stock / avgDailySales;
    if (daysOfStockLeft <= effectiveThresholdDays) {
      items.push({ productId: product.id, productName: product.name, daysOfStockLeft });
    }
  }

  items.sort((a, b) => a.daysOfStockLeft - b.daysOfStockLeft);
  return { affectedCount: items.length, items };
}

/**
 * `unitValue` is the peso value of one piece of that denomination. Coins
 * have no single unit value -- the quantity field there is the loose
 * coins' total peso value entered directly. Ported from
 * apps/tindahan-pos/src/pages/Onboarding/lib.ts.
 */
export interface DenominationDef {
  key: string;
  label: string;
  unitValue: number | null;
}

export const STARTING_CASH_DENOMINATIONS: DenominationDef[] = [
  { key: "d1000", label: "₱1,000", unitValue: 1000 },
  { key: "d500", label: "₱500", unitValue: 500 },
  { key: "d200", label: "₱200", unitValue: 200 },
  { key: "d100", label: "₱100", unitValue: 100 },
  { key: "d50", label: "₱50", unitValue: 50 },
  { key: "d20", label: "₱20", unitValue: 20 },
  { key: "coins", label: "Coins", unitValue: null },
];

const SMALL_CASH_KEYS = ["d100", "d50", "d20", "coins"];

export type DenominationCounts = Record<string, number>;

export function denominationSubtotal(def: DenominationDef, quantity: number): number {
  if (Number.isNaN(quantity) || quantity < 0) return 0;
  return def.unitValue === null ? quantity : def.unitValue * quantity;
}

export function computeStartingFloat(counts: DenominationCounts): number {
  return STARTING_CASH_DENOMINATIONS.reduce((sum, def) => sum + denominationSubtotal(def, counts[def.key] ?? 0), 0);
}

export interface CashHealth {
  level: "good" | "low";
  smallCashValue: number;
  startingFloat: number;
}

/**
 * Heuristic only (not a real accounting rule): a drawer where at least
 * 30% of the count is ₱100-or-smaller bills and coins is considered able
 * to make change comfortably.
 */
const SMALL_CASH_HEALTHY_RATIO = 0.3;

export function computeCashHealth(counts: DenominationCounts): CashHealth {
  const startingFloat = computeStartingFloat(counts);
  const smallCashValue = STARTING_CASH_DENOMINATIONS.filter((def) => SMALL_CASH_KEYS.includes(def.key)).reduce(
    (sum, def) => sum + denominationSubtotal(def, counts[def.key] ?? 0),
    0
  );
  const ratio = startingFloat > 0 ? smallCashValue / startingFloat : 0;
  return {
    level: ratio >= SMALL_CASH_HEALTHY_RATIO ? "good" : "low",
    smallCashValue,
    startingFloat,
  };
}

/** Simple sum/count average -- matches the web app's "average basket" arithmetic. */
export function computeAverageSaleValue(sales: SaleRecord[]): number {
  if (sales.length === 0) return 0;
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  return total / sales.length;
}
