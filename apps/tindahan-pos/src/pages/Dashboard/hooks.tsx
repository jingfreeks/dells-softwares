import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAuth,
  useStoreData,
  buildDailyReport,
  bestSellers,
  buildDashboardWorkbook,
  downloadWorkbook,
  STORE_NAME,
  ERROR_COULD_NOT_GENERATE_REPORT,
} from "@/lib";
import type { Product, SaleRecord, Supplier } from "@/lib";
import type { RestockSuggestion } from "@/lib/inventory";
import type { RestockExportRow } from "@/lib/excelExport";
import { dateRangeForPreset, toDateInputValue } from "@/pages/Reports/lib";

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
 * Merges the low-stock product list with restock-rate suggestions and a
 * category-based supplier guess. `lowStock` is the source of truth for
 * *which* products need attention (it includes products with zero recent
 * sales history, which `restockSuggestions` deliberately excludes since
 * it can't compute a rate for them) — suggestions just enrich a row when
 * the data exists. Sorted out-of-stock first, then soonest to run out;
 * products with no sales history to project from sort last.
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

export type DashboardReportKind =
  | "todaysSales"
  | "transactionsToday"
  | "recentSales"
  | "lowStock"
  | "utang"
  | "bestSellers"
  | "restocking";

/** The calendar day before `dateStr` (yyyy-mm-dd), in local time. */
function previousDateString(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return toDateInputValue(d);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function useDashboardReport() {
  const { products, customers, suppliers, sales, fetchSalesInRange } = useStoreData();
  const { store } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [daySales, setDaySales] = useState<SaleRecord[]>([]);
  const [previousDaySales, setPreviousDaySales] = useState<SaleRecord[]>([]);
  const [rangeLoading, setRangeLoading] = useState(true);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [openReport, setOpenReport] = useState<DashboardReportKind | null>(null);

  const load = useCallback(async () => {
    setRangeLoading(true);
    setRangeError(null);
    try {
      const dayRange = dateRangeForPreset("custom", selectedDate, selectedDate);
      const previousDate = previousDateString(selectedDate);
      const previousRange = dateRangeForPreset("custom", previousDate, previousDate);
      const [day, previous] = await Promise.all([
        fetchSalesInRange(dayRange),
        fetchSalesInRange(previousRange),
      ]);
      setDaySales(day);
      setPreviousDaySales(previous);
    } catch (err) {
      setRangeError(err instanceof Error ? err.message : ERROR_COULD_NOT_GENERATE_REPORT);
    } finally {
      setRangeLoading(false);
    }
  }, [fetchSalesInRange, selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  const reportDate = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate]);
  const report = useMemo(
    () => buildDailyReport(products, daySales, previousDaySales, sales, customers, reportDate),
    [products, daySales, previousDaySales, sales, customers, reportDate]
  );
  const restockRows = useMemo(
    () => buildRestockRows(report.lowStock, report.restockSuggestions, suppliers),
    [report.lowStock, report.restockSuggestions, suppliers]
  );
  // Effectively-unlimited, ranked best sellers for the detail modal/export
  // — the dashboard summary card still only shows report.bestSellers (limit 5).
  const rankedBestSellers = useMemo(() => bestSellers(daySales, products, 1000), [daySales, products]);

  const storeName = store?.name ?? STORE_NAME;
  const storeAddress = store?.address ?? null;

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function exportToExcel() {
    setExporting(true);
    setExportError(null);
    try {
      const restockExportRows: RestockExportRow[] = restockRows.map((row) => ({
        product: row.productName,
        barcode: row.barcode,
        category: row.category,
        currentStock: row.stock,
        minStock: row.minStock,
        suggestedQuantity: row.suggestedQuantity,
        supplier: row.supplier,
        status: row.isOut ? "Out of stock" : "Low stock",
      }));
      const workbook = buildDashboardWorkbook({
        sales: daySales,
        customers,
        bestSellers: rankedBestSellers,
        categoryTotals: report.categoryTotals,
        restockRows: restockExportRows,
      });
      await downloadWorkbook(workbook, `${slugify(storeName)}-dashboard-${selectedDate}.xlsx`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : ERROR_COULD_NOT_GENERATE_REPORT);
    } finally {
      setExporting(false);
    }
  }

  return {
    selectedDate,
    setSelectedDate,
    report,
    daySales,
    allSales: sales,
    restockRows,
    rankedBestSellers,
    rangeLoading,
    rangeError,
    exporting,
    exportError,
    exportToExcel,
    openReport,
    setOpenReport,
    storeName,
    storeAddress,
  };
}
