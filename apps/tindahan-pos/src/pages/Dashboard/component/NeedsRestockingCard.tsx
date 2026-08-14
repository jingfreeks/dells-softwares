import { Link } from "react-router-dom";
import type { RestockRow } from "../hooks";
import { LABEL_NEEDS_RESTOCKING, TEXT_STOCK_LEFT_SUFFIX, EMPTY_STATE_ALL_STOCKED, LINK_RECEIVE, LINK_OPEN } from "@/lib";

/** "12 hrs"/"1 day"/"3 days" — hours below a day, whole days otherwise. */
function formatTimeToOut(daysOfStockLeft: number): string {
  if (daysOfStockLeft < 1) {
    const hours = Math.max(1, Math.round(daysOfStockLeft * 24));
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(daysOfStockLeft);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function NeedsRestockingCard({ rows, onOpenReport }: { rows: RestockRow[]; onOpenReport: () => void }) {
  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{LABEL_NEEDS_RESTOCKING}</p>
        <div className="tpl-row" style={{ width: "auto", marginBottom: 0, gap: 8 }}>
          {rows.length > 0 && <span className="tpl-chip tpl-w">{rows.length} items</span>}
          <span
            role="button"
            tabIndex={0}
            className="tpl-chip"
            style={{ fontSize: 10.5, padding: "3px 9px", gap: 4, cursor: "pointer" }}
            onClick={onOpenReport}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenReport()}
          >
            {LINK_OPEN} <i className="ti ti-arrow-right" aria-hidden style={{ fontSize: 11 }} />
          </span>
        </div>
      </div>
      {rows.slice(0, 8).map((row) => (
        <div className="tpl-lr" key={row.productId}>
          <div className="tpl-flex1">
            <p className="tpl-tp">{row.productName}</p>
            <p className="tpl-ts">
              {row.stock} {TEXT_STOCK_LEFT_SUFFIX}
              {row.avgDailySales !== null && ` · sells ~${row.avgDailySales}/day`}
              {row.daysOfStockLeft !== null && ` · out in ~${formatTimeToOut(row.daysOfStockLeft)}`}
            </p>
          </div>
          <Link
            to="/inventory/receiving"
            state={{ prefillProduct: { productId: row.productId, productName: row.productName, quantity: 1 } }}
            className="tpl-chip tpl-on"
          >
            {LINK_RECEIVE}
          </Link>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>
          {EMPTY_STATE_ALL_STOCKED}
        </p>
      )}
    </div>
  );
}
