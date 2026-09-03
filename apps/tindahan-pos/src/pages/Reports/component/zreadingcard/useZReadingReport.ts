import { useCallback, useEffect, useMemo, useState } from "react";
import { useStoreData, supabase, ERROR_COULD_NOT_TAKE_READING, type SaleRecord } from "@/lib";
import type { RegisterReadingRow } from "@/lib/database.types";
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
  const [persisted, setPersisted] = useState<RegisterReadingRow | null>(null);
  const [taking, setTaking] = useState(false);
  const [takeError, setTakeError] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => dateRangeForPreset("custom", date, date), [date]);

  // The persisted Z for this business date, if the day has been closed. This is
  // the artefact; the computation below is only what the day WOULD read if it
  // were closed now. Fetched separately from the sales so a store with no
  // readings yet -- every store before this ships, since nothing was
  // backfilled -- still sees its figures.
  const loadPersisted = useCallback(async () => {
    const { data } = await supabase
      .from("register_readings")
      .select("*")
      .eq("business_date", date)
      .eq("kind", "Z")
      .order("z_counter", { ascending: false })
      .limit(1);
    setPersisted((data?.[0] as RegisterReadingRow | undefined) ?? null);
  }, [date]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReconciliation(null);
    void loadPersisted();
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
  }, [fetchSalesInRange, startDate, endDate, cashierId, deviceId, loadPersisted]);

  const onTakeReading = useCallback(async () => {
    setTaking(true);
    setTakeError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("take_reading", {
        p_kind: "Z",
        p_business_date: date,
      });
      if (rpcError) throw rpcError;
      setPersisted((data as RegisterReadingRow | null) ?? null);
    } catch (err) {
      setTakeError(err instanceof Error ? err.message : ERROR_COULD_NOT_TAKE_READING);
    } finally {
      setTaking(false);
    }
  }, [date]);

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
    persisted,
    taking,
    takeError,
    onTakeReading,
  };
}
