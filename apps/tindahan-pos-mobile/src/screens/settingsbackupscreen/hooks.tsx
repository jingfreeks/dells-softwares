import { useState } from "react";
import {
  everythingToJson,
  exportFileName,
  productsToCsv,
  salesToCsv,
  shareTextFile,
} from "../../lib/dataExport";
import { useStoreData } from "../../lib/storeData";

/** Which export is currently being written and handed to the share sheet. */
export type ExportKey = "sales" | "products" | "everything";

/**
 * Everything behind the Backup screen. Unusually for this Settings
 * module, there is no mock half at all -- every number and every action
 * here is real:
 *
 *   - the counts and "Refresh now" come from `useStoreData`, the same
 *     store cache the register and dashboard read;
 *   - the exports serialize that live data and hand the file to the OS
 *     share sheet.
 *
 * What the web app's Backup page has that this deliberately doesn't:
 * an offline-queue card (this client has no offline queue to report on)
 * and any kind of "Back up now" button (scheduled backups run outside
 * both apps, and a dump spans every store, so no client can safely read
 * or trigger one).
 */
export function useSettingsBackupScreen() {
  const { products, sales, customers, refresh } = useStoreData();
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<ExportKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRefreshNow() {
    setRefreshing(true);
    setError(null);
    try {
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh your data.");
    } finally {
      setRefreshing(false);
    }
  }

  async function runExport(key: ExportKey, filename: string, content: string, mimeType: string) {
    setExporting(key);
    setError(null);
    try {
      await shareTextFile(filename, content, mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that file.");
    } finally {
      setExporting(null);
    }
  }

  return {
    salesCount: sales.length,
    productsCount: products.length,
    customersCount: customers.length,
    refreshing,
    onRefreshNow: handleRefreshNow,
    exporting,
    error,

    onExportSales: () =>
      runExport("sales", exportFileName("sales", "csv"), salesToCsv(sales), "text/csv"),
    onExportProducts: () =>
      runExport("products", exportFileName("products", "csv"), productsToCsv(products), "text/csv"),
    onExportEverything: () =>
      runExport(
        "everything",
        exportFileName("backup", "json"),
        everythingToJson({ products, sales, customers }),
        "application/json"
      ),
  };
}
