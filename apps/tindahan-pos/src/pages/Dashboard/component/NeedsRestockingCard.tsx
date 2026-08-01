import { Link } from "react-router-dom";
import type { RestockRow } from "../hooks";
import {
  LABEL_NEEDS_RESTOCKING,
  TEXT_STOCK_LEFT_SUFFIX,
  EMPTY_STATE_ALL_STOCKED,
  LINK_RECEIVE,
} from "@/lib";

/** "12 hrs"/"1 day"/"3 days" — hours below a day, whole days otherwise. */
function formatTimeToOut(daysOfStockLeft: number): string {
  if (daysOfStockLeft < 1) {
    const hours = Math.max(1, Math.round(daysOfStockLeft * 24));
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(daysOfStockLeft);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function NeedsRestockingCard({ rows }: { rows: RestockRow[] }) {
  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{LABEL_NEEDS_RESTOCKING}</p>
        {rows.length > 0 && <span className="tpl-chip tpl-w">{rows.length} items</span>}
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
          {row.suggestedQuantity !== null ? (
            <Link
              to="/inventory/receiving"
              state={{
                prefillProduct: {
                  productId: row.productId,
                  productName: row.productName,
                  quantity: row.suggestedQuantity,
                },
              }}
              className="tpl-chip tpl-on"
            >
              Order {row.suggestedQuantity}
            </Link>
          ) : (
            <Link to="/inventory/receiving" className="tpl-chip">
              {LINK_RECEIVE}
            </Link>
          )}
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
