import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  PAGE_HEADING_LOW_STOCK_REVIEW,
  TEXT_LOW_STOCK_REVIEW_RUNNING_LOW_SUFFIX,
  TEXT_LOW_STOCK_REVIEW_DESCRIPTION,
  LABEL_LOW_STOCK_COL_PRODUCT,
  LABEL_LOW_STOCK_COL_STOCK,
  LABEL_LOW_STOCK_COL_RATE,
  LABEL_LOW_STOCK_COL_REORDER,
  TEXT_LOW_STOCK_PER_DAY_SUFFIX,
  TEXT_LOW_STOCK_ORDER_PREFIX,
  TEXT_LOW_STOCK_NO_RATE,
  TEXT_LOW_STOCK_SUGGESTION_NOTE,
  BUTTON_VIEW_INVENTORY,
  TEXT_LOW_STOCK_NONE,
  TEXT_LOW_STOCK_NONE_BODY,
  ARIA_LOW_STOCK_TABLE,
  LABEL_LOADING,
  useStoreData,
  lowStockProducts,
  computeRestockSuggestions,
  buildRestockRows,
} from "@/lib";
import { useReviewEntitlement } from "./hooks";

/**
 * Low Stock Review.
 *
 * Computed from the store's own products and sales rather than from a new RPC,
 * because the calculation already exists: computeRestockSuggestions() and
 * buildRestockRows() are what the Dashboard and Reports already use. The brief
 * is explicit that "low stock", "average daily sales" and "reorder quantity"
 * must not get a second definition, and a SQL reimplementation would have been
 * exactly that — a second definition that drifts from the first.
 *
 * The entitlement is still checked, and it is checked the same way the
 * dashboard checks it, so typing this URL as a Starter user does not work.
 */
export function LowStockReview() {
  const entitled = useReviewEntitlement();
  const navigate = useNavigate();
  const { products, sales, suppliers, loading } = useStoreData();

  const rows = useMemo(() => {
    const low = lowStockProducts(products);
    const suggestions = computeRestockSuggestions(products, sales);
    return buildRestockRows(low, suggestions, suppliers);
  }, [products, sales, suppliers]);

  if (entitled === null) {
    return (
      <div className="tpl-root" style={{ padding: 18 }}>
        <p className="tpl-sub">{LABEL_LOADING}</p>
      </div>
    );
  }

  // Not the upgrade screen: that lives on /review and is the front door. A
  // Starter user who guessed this URL is sent there rather than shown a
  // detail page with the figures stripped out.
  if (!entitled) return <Navigate to="/review" replace />;

  return (
    <div className="tpl-root" style={{ padding: 18 }}>
      <div className="tpl-hd">
        <div>
          <p className="tpl-h1" style={{ fontSize: 21 }}>
            {PAGE_HEADING_LOW_STOCK_REVIEW}
          </p>
          <p className="tpl-sub">
            {rows.length} {TEXT_LOW_STOCK_REVIEW_RUNNING_LOW_SUFFIX}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="tpl-sub">{LABEL_LOADING}</p>
      ) : rows.length === 0 ? (
        <div className="tpl-card" style={{ textAlign: "center", padding: 28 }}>
          <p className="tpl-h3" style={{ marginBottom: 6 }}>
            {TEXT_LOW_STOCK_NONE}
          </p>
          <p className="tpl-sub" style={{ margin: 0 }}>
            {TEXT_LOW_STOCK_NONE_BODY}
          </p>
        </div>
      ) : (
        <div className="tpl-card">
          <p className="tpl-sub" style={{ marginBottom: 14 }}>
            {TEXT_LOW_STOCK_REVIEW_DESCRIPTION}
          </p>

          {/* Wide content scrolls inside its own container so the page body
              never scrolls sideways on a narrow screen. */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
              <caption className="sr-only">{ARIA_LOW_STOCK_TABLE}</caption>
              <thead>
                <tr>
                  <th className="tpl-lbl" style={{ textAlign: "left", padding: "0 8px 8px 0" }}>
                    {LABEL_LOW_STOCK_COL_PRODUCT}
                  </th>
                  <th className="tpl-lbl" style={{ textAlign: "right", padding: "0 8px 8px" }}>
                    {LABEL_LOW_STOCK_COL_STOCK}
                  </th>
                  <th className="tpl-lbl" style={{ textAlign: "right", padding: "0 8px 8px" }}>
                    {LABEL_LOW_STOCK_COL_RATE}
                  </th>
                  <th className="tpl-lbl" style={{ textAlign: "right", padding: "0 0 8px 8px" }}>
                    {LABEL_LOW_STOCK_COL_REORDER}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.productId} style={{ borderTop: "0.5px solid var(--tpl-bd3)" }}>
                    <td style={{ padding: "9px 8px 9px 0", fontSize: 13, color: "var(--tpl-t4)" }}>
                      {row.productName}
                    </td>
                    <td
                      className="tpl-mono"
                      style={{
                        padding: "9px 8px",
                        textAlign: "right",
                        fontSize: 13,
                        // Out of stock is a different problem from low, and the
                        // number says so without relying on colour alone —
                        // it is 0.
                        color: row.isOut ? "var(--tpl-bad)" : undefined,
                      }}
                    >
                      {row.stock}
                    </td>
                    <td
                      className="tpl-mono"
                      style={{ padding: "9px 8px", textAlign: "right", fontSize: 13, color: "var(--tpl-t5)" }}
                    >
                      {row.avgDailySales !== null
                        ? `${row.avgDailySales} ${TEXT_LOW_STOCK_PER_DAY_SUFFIX}`
                        : TEXT_LOW_STOCK_NO_RATE}
                    </td>
                    <td
                      className="tpl-mono"
                      style={{ padding: "9px 0 9px 8px", textAlign: "right", fontSize: 13 }}
                    >
                      {row.suggestedQuantity !== null
                        ? `${TEXT_LOW_STOCK_ORDER_PREFIX} ${row.suggestedQuantity}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* The design asks for this wording and it is worth keeping verbatim:
              the system knows the sales rate, not the shopkeeper's cash, their
              supplier's minimum order, or what is about to go on promotion. */}
          <p className="tpl-ns" style={{ color: "var(--tpl-t5)", margin: "14px 0 0" }}>
            {TEXT_LOW_STOCK_SUGGESTION_NOTE}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row" style={{ marginTop: 14 }}>
        <button
          type="button"
          className="tpl-btnp w-full! sm:w-auto!"
          style={{ marginBottom: 0, whiteSpace: "nowrap" }}
          onClick={() => navigate("/inventory", { state: { needsAttentionOnly: true } })}
        >
          {BUTTON_VIEW_INVENTORY}
        </button>
      </div>
    </div>
  );
}
