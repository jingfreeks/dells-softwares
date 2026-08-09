import {
  PESO,
  LABEL_CASHIER_BREAKDOWN,
  TEXT_NO_SALES_IN_RANGE,
  COLUMN_CASHIER,
  COLUMN_SALES,
  COLUMN_TOTAL,
} from "@/lib";
import type { CashierTotal } from "@/lib/reports";

const COLUMNS = "1fr 100px 120px";

interface CashierBreakdownTableProps {
  rows: CashierTotal[];
  grandTotal: number;
}

export function CashierBreakdownTable({ rows, grandTotal }: CashierBreakdownTableProps) {
  return (
    <div className="tpl-card" style={{ padding: 0, marginBottom: 14 }}>
      <p className="tpl-h2" style={{ padding: "14px 15px 0" }}>
        {LABEL_CASHIER_BREAKDOWN}
      </p>
      <div className="tpl-thead" style={{ gridTemplateColumns: COLUMNS }}>
        <span>{COLUMN_CASHIER}</span>
        <span className="tpl-right">{COLUMN_SALES}</span>
        <span className="tpl-right">{COLUMN_TOTAL}</span>
      </div>

      {rows.length === 0 && (
        <p className="tpl-ts" style={{ padding: "24px 15px", textAlign: "center" }}>
          {TEXT_NO_SALES_IN_RANGE}
        </p>
      )}

      {rows.map((row) => (
        <div
          key={row.cashierId ?? "unknown"}
          className="tpl-trow"
          style={{ gridTemplateColumns: COLUMNS }}
        >
          <span className="tpl-tp">{row.cashierName}</span>
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
