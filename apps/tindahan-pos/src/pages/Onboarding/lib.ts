import type { Product, SaleRecord } from "@/lib/types";
import { computeDailySalesRates } from "@/pages/Inventory/lib";
import type { OnboardingStep } from "./hooks";

const STEP_ORDER: OnboardingStep[] = ["welcome", "profile", "store", "products", "stockAlerts", "congrats"];
const TOTAL_ESTIMATED_MINUTES = 8;

export function onboardingProgressPercent(step: OnboardingStep): number {
  const index = STEP_ORDER.indexOf(step);
  return Math.round((index / (STEP_ORDER.length - 1)) * 100);
}

export function onboardingMinutesLeft(step: OnboardingStep): number {
  const percent = onboardingProgressPercent(step);
  return Math.max(1, Math.round(TOTAL_ESTIMATED_MINUTES * (1 - percent / 100)));
}

export type SidebarStepStatus = "done" | "current" | "upcoming";

/** "Store profile" covers today's separate profile + store steps. */
export function storeProfileStatus(step: OnboardingStep): SidebarStepStatus {
  if (step === "products" || step === "stockAlerts" || step === "congrats") return "done";
  return "current";
}

export function addProductsStatus(step: OnboardingStep): SidebarStepStatus {
  if (step === "stockAlerts" || step === "congrats") return "done";
  if (step === "products") return "current";
  return "upcoming";
}

export function stockAlertsStatus(step: OnboardingStep): SidebarStepStatus {
  if (step === "congrats") return "done";
  if (step === "stockAlerts") return "current";
  return "upcoming";
}

export interface ParsedCsvProduct {
  name: string;
  price: number;
  barcode: string | null;
  category: string | null;
}

export interface CsvParseResult {
  rows: ParsedCsvProduct[];
  error: string | null;
}

/** Splits one CSV line into fields, honoring double-quoted fields that may contain commas. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * Parses a simple CSV export of products: name, price, and optional
 * barcode/category columns, matched by header name (case-insensitive).
 * Excel (.xlsx) isn't supported yet — see ERROR_EXCEL_NOT_SUPPORTED_YET.
 */
export function parseProductsCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    return { rows: [], error: "empty" };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIndex = headers.indexOf("name");
  const priceIndex = headers.indexOf("price");
  if (nameIndex === -1 || priceIndex === -1) {
    return { rows: [], error: "missing-columns" };
  }
  const barcodeIndex = headers.indexOf("barcode");
  const categoryIndex = headers.indexOf("category");

  const rows: ParsedCsvProduct[] = [];
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    const name = fields[nameIndex]?.trim();
    const price = Number(fields[priceIndex]);
    if (!name || Number.isNaN(price) || price < 0) continue;
    rows.push({
      name,
      price,
      barcode: barcodeIndex >= 0 ? fields[barcodeIndex]?.trim() || null : null,
      category: categoryIndex >= 0 ? fields[categoryIndex]?.trim() || null : null,
    });
  }

  return { rows, error: null };
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
 * Reuses Inventory's sales-velocity calculation (30-day lookback) to
 * preview which products would trigger a "days of cover" alert under the
 * given threshold — not gated by each product's existing reorder point,
 * since this previews the new rule, not today's alerts.
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

export type DaysOfStockLeftLabel = { kind: "out" } | { kind: "hours"; hours: number } | { kind: "days"; days: number };

export function formatDaysOfStockLeft(daysOfStockLeft: number): DaysOfStockLeftLabel {
  if (daysOfStockLeft <= 0) return { kind: "out" };
  if (daysOfStockLeft < 1) {
    return { kind: "hours", hours: Math.max(1, Math.round(daysOfStockLeft * 24)) };
  }
  return { kind: "days", days: Math.round(daysOfStockLeft) };
}
