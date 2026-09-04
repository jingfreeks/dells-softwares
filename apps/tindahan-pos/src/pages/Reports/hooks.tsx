import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAuth,
  useStoreData,
  useCan,
  usePermissions,
  supabase,
  salesToCsv,
  vatSalesToCsv,
  voidsToCsv,
  refundsToCsv,
  paymentBreakdownToCsv,
  downloadTextFile,
  computeOldestDebtDays,
  buildDebtAgingSummary,
  ERROR_COULD_NOT_VOID_SALE,
  ERROR_COULD_NOT_REFUND_SALE,
  ERROR_INVALID_OVERRIDE_PIN,
  ERROR_OVERRIDE_PIN_LOCKED,
  type SaleRecord,
  type RefundRecord,
} from "@/lib";
import { buildRangeReport, refundSummary } from "@/lib/reports";
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
  const { user, store } = useAuth();
  // Computed here (not just in Reports.tsx's own redirect check) so every
  // fetch effect below can be gated on it directly -- a hook's effects run
  // on the very first render regardless of what the calling component does
  // with the result, so gating only in the component (a conditional
  // `return <Navigate />` after this hook is already called) still let
  // staff/devices/sales/refunds requests fire for an unauthorized role
  // during the brief window before that redirect takes effect.
  const { loading: permissionsLoading } = usePermissions();
  const canViewReports = useCan("pos.report.view");
  const authorized = !!user && !permissionsLoading && canViewReports;
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
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voidError, setVoidError] = useState<string | null>(null);
  // Opened when void_sale() rejects with VOID_PIN_REQUIRED
  // (20260903190000, stores.void_requires_pin) -- the reason has already
  // been collected by SalesTable's ConfirmDialog by the time this fires,
  // so it's held here rather than re-asked for.
  const [voidPinApproval, setVoidPinApproval] = useState<{ sale: SaleRecord; reason: string } | null>(null);
  const [voidOverridePin, setVoidOverridePin] = useState("");
  const [voidOverridePinError, setVoidOverridePinError] = useState<string | null>(null);
  const [voidOverrideSubmitting, setVoidOverrideSubmitting] = useState(false);
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
    if (!authorized) return;
    supabase
      .from("staff")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCashiers(data ?? []));
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    // No unpaired_at filter, unlike DevicesSettings — a report needs to
    // show historical sales from a since-unpaired device too.
    supabase
      .from("devices")
      .select("id, name")
      .order("name")
      .then(({ data }) => setDevices(data ?? []));
  }, [authorized]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSalesInRange({ startDate, endDate, cashierId, deviceId });
      setSales(rows);

      // refund_sale_items() writes to its own append-only table, never to
      // `sales` (see handleRefundSale below), so it needs its own fetch --
      // best-effort here (silently empty on error, same tolerance as the
      // cashiers/devices effects above) rather than failing the whole report
      // over a supplementary card.
      let refundQuery = supabase
        .from("refunds")
        .select("id, sale_id, actor_id, reason, total_amount, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (cashierId) refundQuery = refundQuery.eq("actor_id", cashierId);
      const { data: refundRows } = await refundQuery;
      const salesById = new Map(rows.map((s) => [s.id, s]));
      const cashierNameById = new Map(cashiers.map((c) => [c.id, c.name]));
      setRefunds(
        (refundRows ?? []).map((r) => ({
          id: r.id,
          saleId: r.sale_id,
          receiptNumber: salesById.get(r.sale_id)?.receiptNumber ?? null,
          cashierName: r.actor_id ? (cashierNameById.get(r.actor_id) ?? null) : null,
          reason: r.reason,
          totalAmount: r.total_amount,
          createdAt: r.created_at,
        }))
      );
    } catch (err) {
      setError(describePlatformError(err, "Could not load the report."));
    } finally {
      setLoading(false);
    }
  }, [fetchSalesInRange, startDate, endDate, cashierId, deviceId, cashiers]);

  useEffect(() => {
    if (!authorized) return;
    load();
  }, [authorized, load]);

  const report = useMemo(() => buildRangeReport(sales, products), [sales, products]);
  const refundReport = useMemo(() => refundSummary(refunds), [refunds]);

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

  function exportVatCsv() {
    const filename = `vat-report-${startDate.slice(0, 10)}-to-${endDate.slice(0, 10)}.csv`;
    downloadTextFile(filename, vatSalesToCsv(sales), "text/csv");
  }

  function exportVoidsCsv() {
    const filename = `voids-report-${startDate.slice(0, 10)}-to-${endDate.slice(0, 10)}.csv`;
    downloadTextFile(filename, voidsToCsv(sales), "text/csv");
  }

  function exportRefundsCsv() {
    const filename = `refunds-report-${startDate.slice(0, 10)}-to-${endDate.slice(0, 10)}.csv`;
    downloadTextFile(filename, refundsToCsv(refunds), "text/csv");
  }

  function exportPaymentBreakdownCsv() {
    const filename = `payment-breakdown-${startDate.slice(0, 10)}-to-${endDate.slice(0, 10)}.csv`;
    downloadTextFile(filename, paymentBreakdownToCsv(report.byPaymentType), "text/csv");
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
      const message = describePlatformError(err, ERROR_COULD_NOT_VOID_SALE);
      if (message.includes("VOID_PIN_REQUIRED")) {
        // Not a failure the admin needs to see as an error -- SalesTable's
        // reason dialog closes normally (this resolves, it doesn't throw)
        // and the PIN dialog below takes over with the reason already in
        // hand.
        setVoidOverridePin("");
        setVoidOverridePinError(null);
        setVoidPinApproval({ sale, reason });
        return;
      }
      setVoidError(message);
      throw err;
    }
  }

  function closeVoidPinApproval() {
    setVoidPinApproval(null);
    setVoidOverridePin("");
    setVoidOverridePinError(null);
  }

  async function submitVoidPinApproval(pin: string) {
    if (!voidPinApproval) return;
    const { sale, reason } = voidPinApproval;
    setVoidOverrideSubmitting(true);
    setVoidOverridePinError(null);
    try {
      await voidSale(sale, reason, pin);
      setSales((prev) =>
        prev.map((s) =>
          s.id === sale.id
            ? { ...s, status: "voided", voidedAt: new Date().toISOString(), voidReason: reason }
            : s
        )
      );
      closeVoidPinApproval();
    } catch (err) {
      const message = describePlatformError(err, ERROR_COULD_NOT_VOID_SALE);
      setVoidOverridePinError(
        message.includes("OVERRIDE_PIN_LOCKED")
          ? ERROR_OVERRIDE_PIN_LOCKED
          : message.includes("INVALID_OVERRIDE_PIN")
            ? ERROR_INVALID_OVERRIDE_PIN
            : message
      );
      setVoidOverridePin("");
    } finally {
      setVoidOverrideSubmitting(false);
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
    refundReport,
    loading,
    error,
    exportCsv,
    exportVatCsv,
    exportVoidsCsv,
    exportRefundsCsv,
    exportPaymentBreakdownCsv,
    onRetry: load,
    debtAging,
    thresholdDays,
    onVoidSale: handleVoidSale,
    voidError,
    voidPinApproval,
    voidOverridePin,
    setVoidOverridePin,
    voidOverridePinError,
    voidOverrideSubmitting,
    closeVoidPinApproval,
    submitVoidPinApproval,
    store,
    receiptSettings,
    reprintingSale,
    onReprintSale: handleReprintSale,
    closeReprint,
    onRefundSale: handleRefundSale,
  };
}
