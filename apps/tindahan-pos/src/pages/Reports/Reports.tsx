import {
  PAGE_HEADING_REPORTS,
  TEXT_REPORTS_DESCRIPTION,
  BUTTON_EXPORT_CSV,
  LABEL_LOADING,
  BUTTON_TRY_AGAIN,
  BUTTON_CLOSE,
  useCan,
} from "@/lib";
import { DebtAgeCard } from "@/components";
import { ReceiptModal } from "@/pages/Pos/component/receiptmodal";
import {
  DateRangeFilter,
  CashierFilter,
  DeviceFilter,
  SummaryCards,
  CashierBreakdownTable,
  SalesTable,
  VatSummaryCard,
} from "./component";
import { useReportsPage } from "./hooks";
import "../authTheme.css";

export function Reports() {
  const {
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
    onRetry,
    debtAging,
    thresholdDays,
    onVoidSale,
    voidError,
    store,
    receiptSettings,
    reprintingSale,
    onReprintSale,
    closeReprint,
  } = useReportsPage();

  // void_sale() is now permission-gated (0045_rbac_enforce_checkpoints.sql)
  // rather than unconditionally admin-only — hide the action entirely
  // (SalesTable's existing convention) when the signed-in staff member
  // doesn't hold it, instead of letting them hit a server rejection.
  const canVoidSale = useCan("pos.sale.void");

  return (
    <div className="tpl-root">
      <div className="tpl-hd">
        <div>
          <p className="tpl-h1">{PAGE_HEADING_REPORTS}</p>
          <p className="tpl-sub">{TEXT_REPORTS_DESCRIPTION}</p>
        </div>
        <button type="button" className="tpl-btn" onClick={exportCsv} style={{ width: "auto" }}>
          {BUTTON_EXPORT_CSV}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 18 }}>
        <DateRangeFilter
          preset={preset}
          onPresetChange={setPreset}
          customStart={customStart}
          onCustomStartChange={setCustomStart}
          customEnd={customEnd}
          onCustomEndChange={setCustomEnd}
        />
        <CashierFilter cashiers={cashiers} cashierId={cashierId} onChange={setCashierId} />
        <DeviceFilter devices={devices} deviceId={deviceId} onChange={setDeviceId} />
      </div>

      {error && (
        <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {error}
          <button type="button" className="tpl-lnk" onClick={onRetry} style={{ marginLeft: 8 }}>
            {BUTTON_TRY_AGAIN}
          </button>
        </p>
      )}

      {loading ? (
        <p className="tpl-ts">{LABEL_LOADING}</p>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <SummaryCards report={report} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <DebtAgeCard aging={debtAging} thresholdDays={thresholdDays} />
          </div>
          {(report.vatSummary.vatableSales > 0 ||
            report.vatSummary.vatAmount > 0 ||
            report.vatSummary.vatExemptSales > 0 ||
            report.vatSummary.zeroRatedSales > 0) && <VatSummaryCard summary={report.vatSummary} />}
          <CashierBreakdownTable rows={report.byCashier} grandTotal={report.totalSales} />
          <SalesTable
            sales={report.sales}
            onVoidSale={canVoidSale ? onVoidSale : undefined}
            voidError={voidError}
            onReprintSale={onReprintSale}
          />
        </>
      )}

      <ReceiptModal
        open={!!reprintingSale}
        sale={reprintingSale}
        store={store}
        settings={receiptSettings}
        tin={store?.tin ?? undefined}
        businessPermitNo={store?.businessPermitNo ?? undefined}
        autoPrint={false}
        onClose={closeReprint}
        isReprint
        closeLabel={BUTTON_CLOSE}
      />
    </div>
  );
}
