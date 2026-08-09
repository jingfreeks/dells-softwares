import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAuth,
  useStoreData,
  supabase,
  salesToCsv,
  downloadTextFile,
  computeOldestDebtDays,
  buildDebtAgingSummary,
  type SaleRecord,
} from "@/lib";
import { buildRangeReport } from "@/lib/reports";
import { DEFAULT_ALERTS_MOCK, loadAlertsMock } from "@/pages/Settings/alertsMock";
import { dateRangeForPreset, toDateInputValue, type DateRangePreset } from "./lib";

interface CashierOption {
  id: string;
  name: string;
}

export function useReportsPage() {
  const { products, customers, sales: allSales, fetchSalesInRange } = useStoreData();
  const { store } = useAuth();
  const thresholdDays = useMemo(
    () => (store ? loadAlertsMock(store.id).utangAgingThresholdDays : DEFAULT_ALERTS_MOCK.utangAgingThresholdDays),
    [store]
  );
  // Tindahan plan (₱499/mo) includes a 7-day report lookback; higher plans
  // get full history. This client-side clamp is a UX mirror of the real
  // enforcement, which lives in the sales/sale_items RLS policies
  // (migration 0029) — the server, not this value, is the actual gate.
  const maxLookbackDays = store?.plan === "tindahan" ? 7 : undefined;
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const now = useMemo(() => new Date(), []);
  const [customStart, setCustomStart] = useState(toDateInputValue(now));
  const [customEnd, setCustomEnd] = useState(toDateInputValue(now));
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [cashiers, setCashiers] = useState<CashierOption[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(
    () => dateRangeForPreset(preset, customStart, customEnd, new Date(), maxLookbackDays),
    [preset, customStart, customEnd, maxLookbackDays]
  );

  useEffect(() => {
    supabase
      .from("staff")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCashiers(data ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSalesInRange({ startDate, endDate, cashierId });
      setSales(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the report.");
    } finally {
      setLoading(false);
    }
  }, [fetchSalesInRange, startDate, endDate, cashierId]);

  useEffect(() => {
    load();
  }, [load]);

  const report = useMemo(() => buildRangeReport(sales, products), [sales, products]);

  // Aging is a point-in-time snapshot of current balances, not scoped to
  // the selected date-range preset, so it's computed from the full sales
  // history (same source/caveats as the Customers page) rather than `sales`
  // above (the range-filtered rows powering the summary cards/table).
  const oldestDebtDaysById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const customer of customers) map.set(customer.id, computeOldestDebtDays(allSales, customer));
    return map;
  }, [customers, allSales]);
  const debtAging = useMemo(
    () => buildDebtAgingSummary(customers, oldestDebtDaysById, thresholdDays),
    [customers, oldestDebtDaysById, thresholdDays]
  );

  function exportCsv() {
    const filename = `sales-report-${startDate.slice(0, 10)}-to-${endDate.slice(0, 10)}.csv`;
    downloadTextFile(filename, salesToCsv(sales), "text/csv");
  }

  return {
    preset,
    setPreset,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    cashierId,
    setCashierId,
    cashiers,
    report,
    loading,
    error,
    exportCsv,
    onRetry: load,
    debtAging,
    thresholdDays,
    maxLookbackDays,
  };
}
