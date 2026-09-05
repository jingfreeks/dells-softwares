import {
  PESO,
  printReport,
  LABEL_Z_READING,
  LABEL_BUSINESS_DATE,
  LABEL_TOTAL_SALES,
  LABEL_TRANSACTIONS,
  LABEL_BEGINNING_RECEIPT_NO,
  LABEL_ENDING_RECEIPT_NO,
  LABEL_TOTAL_DISCOUNTS,
  LABEL_VATABLE_SALES,
  LABEL_VAT_AMOUNT,
  LABEL_VOIDED_COUNT,
  LABEL_VOIDED_TOTAL,
  LABEL_RECONCILIATION_CHECK,
  TEXT_RECONCILIATION_MATCH,
  TEXT_RECONCILIATION_MISMATCH,
  TEXT_Z_READING_EMPTY,
  BUTTON_PRINT_Z_READING,
  BUTTON_TRY_AGAIN,
  LABEL_LOADING,
  COLUMN_PAYMENT_TYPE,
  COLUMN_TRANSACTIONS,
  TABLE_HEADER_TOTAL,
  LABEL_PAYMENT_CASH,
  LABEL_PAYMENT_QR,
  LABEL_PAYMENT_UTANG,
  BUTTON_TAKE_Z_READING,
  BUTTON_TAKING_READING,
  LABEL_Z_COUNTER,
  LABEL_GRAND_TOTAL,
  LABEL_LATE_ENTRIES,
  TEXT_Z_CLOSED_PREFIX,
  TEXT_Z_NOT_CLOSED,
  TEXT_Z_PROVISIONAL,
  TEXT_Z_FROM_RECORD,
  type PaymentType,
  formatDateTime,
} from "@/lib";
import { CashierFilter } from "../cashierfilter";
import { DeviceFilter } from "../devicefilter";
import { useZReadingReport } from "./useZReadingReport";

const PAYMENT_LABEL: Record<PaymentType, string> = {
  cash: LABEL_PAYMENT_CASH,
  qr: LABEL_PAYMENT_QR,
  credit: LABEL_PAYMENT_UTANG,
};

interface ZReadingCardProps {
  storeName: string;
  storeAddress: string | null;
  printedByName: string;
  cashiers: { id: string; name: string }[];
  devices: { id: string; name: string }[];
}

/** BIR compliance: end-of-day (Z-reading) closing report for one business
 * date — built entirely from the same reporting-layer aggregates every
 * other card on this page already uses, plus the receipt-number sequence
 * as the modern equivalent of a mechanical register's beginning/ending
 * grand-total figures. */
export function ZReadingCard({ storeName, storeAddress, printedByName, cashiers, devices }: ZReadingCardProps) {
  const {
    date,
    setDate,
    cashierId,
    setCashierId,
    deviceId,
    setDeviceId,
    report,
    receiptRange,
    discounts,
    loading,
    error,
    onRetry,
    reconciliation,
    persisted,
    taking,
    takeError,
    onTakeReading,
  } = useZReadingReport();

  // When the day has been closed, every figure below comes from the record
  // taken at that moment. When it has not, they are recomputed from sales and
  // are provisional -- which is the distinction the banner exists to make.
  const breakdown = (persisted?.payment_breakdown ?? {}) as Record<
    string,
    { count: number; total: number }
  >;
  const view = persisted
    ? {
        totalSales: Number(persisted.net_sales),
        transactionCount: persisted.transaction_count,
        beginning: persisted.beginning_receipt,
        ending: persisted.ending_receipt,
        discounts: Number(persisted.total_discounts),
        vatableSales: Number(persisted.vatable_sales),
        vatAmount: Number(persisted.vat_amount),
        voidedCount: persisted.voided_count,
        voidedTotal: Number(persisted.voided_total),
        payments: Object.entries(breakdown).map(([paymentType, v]) => ({
          paymentType: paymentType as PaymentType,
          transactionCount: Number(v.count),
          total: Number(v.total),
        })),
      }
    : {
        totalSales: report.totalSales,
        transactionCount: report.transactionCount,
        beginning: receiptRange.beginning,
        ending: receiptRange.ending,
        discounts,
        vatableSales: report.vatSummary.vatableSales,
        vatAmount: report.vatSummary.vatAmount,
        voidedCount: report.voidSummary.count,
        voidedTotal: report.voidSummary.totalAmount,
        payments: report.byPaymentType,
      };

  function handlePrint() {
    printReport({
      storeName,
      storeAddress,
      title: LABEL_Z_READING,
      subtitle: date,
      printedByName,
      summaryTiles: [
        { label: LABEL_TOTAL_SALES, value: PESO.format(view.totalSales) },
        { label: LABEL_TRANSACTIONS, value: String(view.transactionCount) },
        { label: LABEL_BEGINNING_RECEIPT_NO, value: view.beginning ?? "—" },
        { label: LABEL_ENDING_RECEIPT_NO, value: view.ending ?? "—" },
        { label: LABEL_TOTAL_DISCOUNTS, value: PESO.format(view.discounts) },
        { label: LABEL_VATABLE_SALES, value: PESO.format(view.vatableSales) },
        { label: LABEL_VAT_AMOUNT, value: PESO.format(view.vatAmount) },
        { label: LABEL_VOIDED_COUNT, value: String(view.voidedCount) },
        { label: LABEL_VOIDED_TOTAL, value: PESO.format(view.voidedTotal) },
        ...(persisted
          ? [
              { label: LABEL_Z_COUNTER, value: String(persisted.z_counter ?? "—") },
              { label: LABEL_GRAND_TOTAL, value: PESO.format(Number(persisted.grand_total)) },
            ]
          : []),
      ],
      columns: [
        { header: COLUMN_PAYMENT_TYPE },
        { header: COLUMN_TRANSACTIONS, align: "right" },
        { header: TABLE_HEADER_TOTAL, align: "right" },
      ],
      rows: view.payments.map((row) => [
        PAYMENT_LABEL[row.paymentType],
        String(row.transactionCount),
        PESO.format(row.total),
      ]),
      emptyMessage: TEXT_Z_READING_EMPTY,
      footerNote: persisted
        ? `Z-reading ${persisted.z_counter} taken ${formatDateTime(persisted.closed_at)} — read from the closing record, not recomputed.`
        : `Provisional — this business date has not been closed. Figures recomputed from recorded sales data; no manual adjustments made.`,
    });
  }

  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <div className="tpl-sp" style={{ marginBottom: 11, flexWrap: "wrap", gap: 10 }}>
        <p className="tpl-h3">{LABEL_Z_READING}</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="tpl-fld" style={{ padding: "0 10px", width: "auto" }}>
            <label htmlFor="z-reading-date" className="tpl-lbl" style={{ marginRight: 6 }}>
              {LABEL_BUSINESS_DATE}
            </label>
            <input id="z-reading-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <CashierFilter cashiers={cashiers} cashierId={cashierId} onChange={setCashierId} />
          <DeviceFilter devices={devices} deviceId={deviceId} onChange={setDeviceId} />
          <button type="button" className="tpl-lnk" style={{ fontSize: 12 }} onClick={handlePrint}>
            {BUTTON_PRINT_Z_READING}
          </button>
        </div>
      </div>

      <div
        className="tpl-sp"
        style={{ marginBottom: 12, flexWrap: "wrap", gap: 8, alignItems: "center" }}
      >
        <p className="tpl-ts" style={{ margin: 0 }}>
          {persisted ? (
            <>
              <strong>
                {TEXT_Z_CLOSED_PREFIX} · {LABEL_Z_COUNTER} {persisted.z_counter}
              </strong>{" "}
              · {LABEL_GRAND_TOTAL} {PESO.format(Number(persisted.grand_total))}
              {persisted.late_entry_count > 0 && (
                <>
                  {" "}
                  · {LABEL_LATE_ENTRIES} {persisted.late_entry_count} (
                  {PESO.format(Number(persisted.late_entry_total))})
                </>
              )}
              <br />
              <span style={{ color: "var(--tpl-t8)" }}>{TEXT_Z_FROM_RECORD}</span>
            </>
          ) : (
            <>
              <strong>{TEXT_Z_NOT_CLOSED}</strong>
              <br />
              <span style={{ color: "var(--tpl-t8)" }}>{TEXT_Z_PROVISIONAL}</span>
            </>
          )}
        </p>
        {!persisted && (
          <button type="button" className="tpl-btn" disabled={taking} onClick={onTakeReading}>
            {taking ? BUTTON_TAKING_READING : BUTTON_TAKE_Z_READING}
          </button>
        )}
      </div>

      {takeError && (
        <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {takeError}
        </p>
      )}

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
      ) : view.transactionCount === 0 && !persisted ? (
        <p className="tpl-ts" style={{ padding: "12px 0", textAlign: "center" }}>
          {TEXT_Z_READING_EMPTY}
        </p>
      ) : (
        <>
          <div className="tpl-g4">
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_TOTAL_SALES.toUpperCase()}</p>
              <p className="tpl-mval">{PESO.format(view.totalSales)}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_TRANSACTIONS.toUpperCase()}</p>
              <p className="tpl-mval">{view.transactionCount}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_BEGINNING_RECEIPT_NO.toUpperCase()}</p>
              <p className="tpl-mval">{view.beginning ?? "—"}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_ENDING_RECEIPT_NO.toUpperCase()}</p>
              <p className="tpl-mval">{view.ending ?? "—"}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_TOTAL_DISCOUNTS.toUpperCase()}</p>
              <p className="tpl-mval">{PESO.format(view.discounts)}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_VOIDED_COUNT.toUpperCase()}</p>
              <p className="tpl-mval">{view.voidedCount}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_VOIDED_TOTAL.toUpperCase()}</p>
              <p className="tpl-mval">{PESO.format(view.voidedTotal)}</p>
            </div>
          </div>

          {reconciliation && (
            <p
              role="status"
              className="tpl-ts"
              style={{ marginTop: 11, color: reconciliation.matches ? undefined : "var(--tpl-bad)" }}
            >
              {LABEL_RECONCILIATION_CHECK}: {reconciliation.matches ? TEXT_RECONCILIATION_MATCH : TEXT_RECONCILIATION_MISMATCH}
            </p>
          )}
        </>
      )}
    </div>
  );
}
