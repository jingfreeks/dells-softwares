import {
  PESO,
  LABEL_PAYMENT_BREAKDOWN,
  TEXT_NO_SALES_IN_RANGE,
  COLUMN_PAYMENT_TYPE,
  COLUMN_SALES,
  COLUMN_TOTAL,
  BUTTON_EXPORT_PAYMENT_CSV,
  LABEL_PAYMENT_CASH,
  LABEL_PAYMENT_QR,
  LABEL_PAYMENT_UTANG,
  type PaymentType,
} from "@/lib";
import type { PaymentTypeTotal } from "@/lib/reports";

const COLUMNS = "1fr 100px 120px";

const PAYMENT_LABEL: Record<PaymentType, string> = {
  cash: LABEL_PAYMENT_CASH,
  qr: LABEL_PAYMENT_QR,
  credit: LABEL_PAYMENT_UTANG,
};

interface PaymentBreakdownTableProps {
  rows: PaymentTypeTotal[];
  grandTotal: number;
  onExport: () => void;
}

/** Payment-method breakdown report — a producible artifact in its own
 * right, not just per-row payment labels in SalesTable. */
export function PaymentBreakdownTable({ rows, grandTotal, onExport }: PaymentBreakdownTableProps) {
  return (
    <div className="tpl-card" style={{ padding: 0, marginBottom: 14 }}>
      <div className="tpl-sp" style={{ padding: "14px 15px 0" }}>
        <p className="tpl-h2">{LABEL_PAYMENT_BREAKDOWN}</p>
        <button type="button" className="tpl-lnk" style={{ fontSize: 12 }} onClick={onExport}>
          {BUTTON_EXPORT_PAYMENT_CSV}
        </button>
      </div>
      <div className="tpl-thead" style={{ gridTemplateColumns: COLUMNS }}>
        <span>{COLUMN_PAYMENT_TYPE}</span>
        <span className="tpl-right">{COLUMN_SALES}</span>
        <span className="tpl-right">{COLUMN_TOTAL}</span>
      </div>

      {rows.length === 0 && (
        <p className="tpl-ts" style={{ padding: "24px 15px", textAlign: "center" }}>
          {TEXT_NO_SALES_IN_RANGE}
        </p>
      )}

      {rows.map((row) => (
        <div key={row.paymentType} className="tpl-trow" style={{ gridTemplateColumns: COLUMNS }}>
          <span className="tpl-tp">{PAYMENT_LABEL[row.paymentType]}</span>
          <span className="tpl-ts tpl-right">{row.transactionCount}</span>
          <span className="tpl-ts tpl-right">
            {PESO.format(row.total)}
            {grandTotal > 0 && <span style={{ marginLeft: 6 }}>({Math.round((row.total / grandTotal) * 100)}%)</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
