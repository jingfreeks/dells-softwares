import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAuth,
  useStoreData,
  supabase,
  salesToCsv,
  downloadTextFile,
  computeOldestDebtDays,
  buildDebtAgingSummary,
  ERROR_COULD_NOT_VOID_SALE,
  ERROR_COULD_NOT_REFUND_SALE,
  type SaleRecord,
} from "@/lib";
import { buildRangeReport } from "@/lib/reports";
import { describePlatformError } from "@/lib/platformErrors";
import { DEFAULT_ALERTS_MOCK, loadAlertsMock } from "@/pages/Settings/alertsMock";
import {
  DEFAULT_RECEIPT_SETTINGS_MOCK,
  loadReceiptSettingsMock,
} from "@/pages/Settings/receiptSettingsMock";
import { dateRangeForPreset, toDateInputValue, type DateRangePreset } from "./lib";

interface CashierOption {
  id: string;
  name: string;
}

interface DeviceOption {
  id: string;
  name: string;
}

export function useReportsPage() {
  const { products, customers, sales: allSales, fetchSalesInRange, voidSale, refundSale } = useStoreData();
  const { store } = useAuth();
  const thresholdDays = useMemo(
    () => (store ? loadAlertsMock(store.id).utangAgingThresholdDays : DEFAULT_ALERTS_MOCK.utangAgingThresholdDays),
    [store]
  );
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const now = useMemo(() => new Date(), []);
  const [customStart, setCustomStart] = useState(toDateInputValue(now));
  const [customEnd, setCustomEnd] = useState(toDateInputValue(now));
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [cashiers, setCashiers] = useState<CashierOption[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  const [reprintingSale, setReprintingSale] = useState<SaleRecord | null>(null);
  const receiptSettings = useMemo(
    () => (store ? loadReceiptSettingsMock(store.id) : DEFAULT_RECEIPT_SETTINGS_MOCK),
    [store]
  );

  const { startDate, endDate } = useMemo(
    () => dateRangeForPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  useEffect(() => {
    supabase
      .from("staff")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCashiers(data ?? []));
  }, []);

  useEffect(() => {
    // No unpaired_at filter, unlike DevicesSettings — a report needs to
    // show historical sales from a since-unpaired device too.
    supabase
      .from("devices")
      .select("id, name")
      .order("name")
      .then(({ data }) => setDevices(data ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSalesInRange({ startDate, endDate, cashierId, deviceId });
      setSales(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the report.");
    } finally {
      setLoading(false);
    }
  }, [fetchSalesInRange, startDate, endDate, cashierId, deviceId]);

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

  // Reports' `sales` is its own range-scoped fetch, separate from the
  // capped 100-row cache StoreDataContext keeps for the Dashboard — so
  // once void_sale() succeeds (and voidSale() above has already patched
  // that shared cache/products/customers), this page also marks its own
  // copy of the row voided rather than re-fetching the whole range.
  async function handleVoidSale(sale: SaleRecord, reason: string) {
    setVoidError(null);
    try {
      await voidSale(sale, reason);
      setSales((prev) =>
        prev.map((s) =>
          s.id === sale.id
            ? { ...s, status: "voided", voidedAt: new Date().toISOString(), voidReason: reason }
            : s
        )
      );
    } catch (err) {
      setVoidError(describePlatformError(err, ERROR_COULD_NOT_VOID_SALE));
      throw err;
    }
  }

  // Reprinting itself is a pure read -- the sale is already sitting in this
  // page's own `sales` state. The RPC call only records the audit entry, and
  // is best-effort: a logging failure must never block the cashier from
  // seeing the receipt they clicked to view (same instinct as
  // request_plan_upgrade's post-signup call).
  function handleReprintSale(sale: SaleRecord) {
    setReprintingSale(sale);
    supabase.rpc("log_receipt_reprint", { p_sale_id: sale.id }).then(
      () => {},
      () => {}
    );
  }

  function closeReprint() {
    setReprintingSale(null);
  }

  // Deliberately does not patch `sales` state on success (unlike void) --
  // refund_sale_items() is append-only and never changes the original sale
  // row itself, so there's nothing on the sale to update here.
  async function handleRefundSale(
    sale: SaleRecord,
    reason: string,
    items: { saleItemId: string; quantity: number }[]
  ) {
    try {
      return await refundSale(sale, reason, items);
    } catch (err) {
      throw new Error(describePlatformError(err, ERROR_COULD_NOT_REFUND_SALE));
    }
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
    deviceId,
    setDeviceId,
    devices,
    report,
    loading,
    error,
    exportCsv,
    onRetry: load,
    debtAging,
    thresholdDays,
    onVoidSale: handleVoidSale,
    voidError,
    store,
    receiptSettings,
    reprintingSale,
    onReprintSale: handleReprintSale,
    closeReprint,
    onRefundSale: handleRefundSale,
  };
}
