import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAuth,
  useStoreData,
  buildDailyReport,
  bestSellers,
  completedSales,
  buildDashboardWorkbook,
  downloadWorkbook,
  STORE_NAME,
  ERROR_COULD_NOT_GENERATE_REPORT, describePlatformError } from "@/lib";
import type { SaleRecord } from "@/lib";
import { buildRestockRows, type RestockRow } from "@/lib/inventory";
import type { RestockExportRow } from "@/lib/excelExport";
import { dateRangeForPreset, toDateInputValue } from "@/pages/Reports/lib";


/**
 * Merges the low-stock product list with restock-rate suggestions and a
 * category-based supplier guess. `lowStock` is the source of truth for
 * *which* products need attention (it includes products with zero recent
 * sales history, which `restockSuggestions` deliberately excludes since
 * it can't compute a rate for them) — suggestions just enrich a row when
 * the data exists. Sorted out-of-stock first, then soonest to run out;
 * products with no sales history to project from sort last.
 */

export type { RestockRow };

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
      // The Dashboard is a live-performance snapshot, not the audit view
      // (that's Reports/SalesTable, which shows voided rows with a badge
      // and the void action itself) — so a voided sale is excluded here
      // at the source, once, rather than every card/modal/export having
      // to remember to filter it out of its own total.
      setDaySales(completedSales(day));
      setPreviousDaySales(completedSales(previous));
    } catch (err) {
      setRangeError(describePlatformError(err, ERROR_COULD_NOT_GENERATE_REPORT));
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
      setExportError(describePlatformError(err, ERROR_COULD_NOT_GENERATE_REPORT));
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
