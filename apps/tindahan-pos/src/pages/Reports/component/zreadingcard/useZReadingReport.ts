import { useCallback, useEffect, useMemo, useState } from "react";
import { useStoreData, supabase, type SaleRecord } from "@/lib";
import { buildRangeReport, receiptNumberRange, totalDiscounts } from "@/lib/reports";
import { dateRangeForPreset, toDateInputValue } from "../../lib";

interface ReconciliationResult {
  matches: boolean;
  serverTotal: number;
}

/**
 * A Z-reading is a closing artifact for one specific business date, kept
 * deliberately independent of the main Reports page's own (possibly
 * multi-day) date-range filters — its own date/cashier/device selection
 * and its own fetch.
 */
export function useZReadingReport() {
  const { products, fetchSalesInRange } = useStoreData();
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);

  const { startDate, endDate } = useMemo(() => dateRangeForPreset("custom", date, date), [date]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReconciliation(null);
    try {
      const rows = await fetchSalesInRange({ startDate, endDate, cashierId, deviceId });
      setSales(rows);
      // Best-effort, independent of the report render itself -- a failed
      // reconciliation call must never block seeing the Z-reading.
      supabase.rpc("report_reconciliation", { p_start: startDate, p_end: endDate }).then(
        ({ data }) => {
          const row = data?.[0];
          if (!row) return;
          const clientTotal = rows.filter((s) => s.status !== "voided").reduce((sum, s) => sum + s.total, 0);
          setReconciliation({
            matches: Math.abs(Number(row.total) - clientTotal) < 0.005,
            serverTotal: Number(row.total),
          });
        },
        () => {}
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the Z-reading.");
    } finally {
      setLoading(false);
    }
  }, [fetchSalesInRange, startDate, endDate, cashierId, deviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const report = useMemo(() => buildRangeReport(sales, products), [sales, products]);
  const receiptRange = useMemo(() => receiptNumberRange(sales), [sales]);
  const discounts = useMemo(() => totalDiscounts(sales), [sales]);

  return {
    date,
    setDate,
    cashierId,
    setCashierId,
    deviceId,
    setDeviceId,
    sales,
    report,
    receiptRange,
    discounts,
    loading,
    error,
    onRetry: load,
    reconciliation,
  };
}
