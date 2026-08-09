import {
  PAGE_HEADING_REPORTS,
  TEXT_REPORTS_DESCRIPTION,
  BUTTON_EXPORT_CSV,
  LABEL_LOADING,
  BUTTON_TRY_AGAIN,
} from "@/lib";
import { DebtAgeCard } from "@/components";
import { DateRangeFilter, CashierFilter, SummaryCards, CashierBreakdownTable, SalesTable } from "./component";
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
    report,
    loading,
    error,
    exportCsv,
    onRetry,
    debtAging,
    thresholdDays,
  } = useReportsPage();

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
          <CashierBreakdownTable rows={report.byCashier} grandTotal={report.totalSales} />
          <SalesTable sales={report.sales} />
        </>
      )}
    </div>
  );
}
