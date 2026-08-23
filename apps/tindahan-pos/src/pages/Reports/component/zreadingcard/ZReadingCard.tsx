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
  type PaymentType,
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
  } = useZReadingReport();

  function handlePrint() {
    printReport({
      storeName,
      storeAddress,
      title: LABEL_Z_READING,
      subtitle: date,
      printedByName,
      summaryTiles: [
        { label: LABEL_TOTAL_SALES, value: PESO.format(report.totalSales) },
        { label: LABEL_TRANSACTIONS, value: String(report.transactionCount) },
        { label: LABEL_BEGINNING_RECEIPT_NO, value: receiptRange.beginning ?? "—" },
        { label: LABEL_ENDING_RECEIPT_NO, value: receiptRange.ending ?? "—" },
        { label: LABEL_TOTAL_DISCOUNTS, value: PESO.format(discounts) },
        { label: LABEL_VATABLE_SALES, value: PESO.format(report.vatSummary.vatableSales) },
        { label: LABEL_VAT_AMOUNT, value: PESO.format(report.vatSummary.vatAmount) },
        { label: LABEL_VOIDED_COUNT, value: String(report.voidSummary.count) },
        { label: LABEL_VOIDED_TOTAL, value: PESO.format(report.voidSummary.totalAmount) },
      ],
      columns: [
        { header: COLUMN_PAYMENT_TYPE },
        { header: COLUMN_TRANSACTIONS, align: "right" },
        { header: TABLE_HEADER_TOTAL, align: "right" },
      ],
      rows: report.byPaymentType.map((row) => [
        PAYMENT_LABEL[row.paymentType],
        String(row.transactionCount),
        PESO.format(row.total),
      ]),
      emptyMessage: TEXT_Z_READING_EMPTY,
      footerNote: `Z-reading generated from recorded sales data — no manual adjustments made.`,
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
      ) : report.transactionCount === 0 ? (
        <p className="tpl-ts" style={{ padding: "12px 0", textAlign: "center" }}>
          {TEXT_Z_READING_EMPTY}
        </p>
      ) : (
        <>
          <div className="tpl-g4">
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_TOTAL_SALES.toUpperCase()}</p>
              <p className="tpl-mval">{PESO.format(report.totalSales)}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_TRANSACTIONS.toUpperCase()}</p>
              <p className="tpl-mval">{report.transactionCount}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_BEGINNING_RECEIPT_NO.toUpperCase()}</p>
              <p className="tpl-mval">{receiptRange.beginning ?? "—"}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_ENDING_RECEIPT_NO.toUpperCase()}</p>
              <p className="tpl-mval">{receiptRange.ending ?? "—"}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_TOTAL_DISCOUNTS.toUpperCase()}</p>
              <p className="tpl-mval">{PESO.format(discounts)}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_VOIDED_COUNT.toUpperCase()}</p>
              <p className="tpl-mval">{report.voidSummary.count}</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">{LABEL_VOIDED_TOTAL.toUpperCase()}</p>
              <p className="tpl-mval">{PESO.format(report.voidSummary.totalAmount)}</p>
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
