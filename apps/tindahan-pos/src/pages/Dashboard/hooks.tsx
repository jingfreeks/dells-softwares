import { useMemo, useState } from "react";
import { buildDailyReport, STORE_NAME, ERROR_COULD_NOT_GENERATE_REPORT } from "@/lib";
import type { Customer, Product, SaleRecord } from "@/lib";
import type { RestockSuggestion } from "@/lib/inventory";

export interface RestockRow {
  productId: string;
  productName: string;
  stock: number;
  isOut: boolean;
  avgDailySales: number | null;
  daysOfStockLeft: number | null;
  suggestedQuantity: number | null;
}

/**
 * Merges the low-stock product list with restock-rate suggestions.
 * `lowStock` is the source of truth for *which* products need attention
 * (it includes products with zero recent sales history, which
 * `restockSuggestions` deliberately excludes since it can't compute a
 * rate for them) — suggestions just enrich a row when the data exists.
 * Sorted out-of-stock first, then soonest to run out; products with no
 * sales history to project from sort last.
 */
export function buildRestockRows(lowStock: Product[], suggestions: RestockSuggestion[]): RestockRow[] {
  const suggestionByProductId = new Map(suggestions.map((s) => [s.productId, s]));

  return [...lowStock]
    .map((p) => {
      const suggestion = suggestionByProductId.get(p.id);
      return {
        productId: p.id,
        productName: p.name,
        stock: p.stock,
        isOut: p.stock <= 0,
        avgDailySales: suggestion?.avgDailySales ?? null,
        daysOfStockLeft: suggestion?.daysOfStockLeft ?? null,
        suggestedQuantity: suggestion?.suggestedQuantity ?? null,
      };
    })
    .sort((a, b) => {
      if (a.isOut !== b.isOut) return a.isOut ? -1 : 1;
      const aDays = a.daysOfStockLeft ?? Infinity;
      const bDays = b.daysOfStockLeft ?? Infinity;
      return aDays - bDays;
    });
}

export function useDashboardReport(products: Product[], sales: SaleRecord[], customers: Customer[]) {
  const [exporting, setExporting] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const report = useMemo(() => buildDailyReport(products, sales, customers), [products, sales, customers]);
  const restockRows = useMemo(
    () => buildRestockRows(report.lowStock, report.restockSuggestions),
    [report.lowStock, report.restockSuggestions]
  );

  async function exportReport() {
    setExporting(true);
    setReportNotice(null);
    try {
      const { downloadDailyReportPdf } = await import("@/lib/reportPdf");
      downloadDailyReportPdf(report, STORE_NAME);
    } catch (err) {
      setReportNotice(err instanceof Error ? err.message : ERROR_COULD_NOT_GENERATE_REPORT);
    } finally {
      setExporting(false);
    }
  }

  return {
    report,
    restockRows,
    exporting,
    reportNotice,
    exportReport,
  };
}
