import {
  PAGE_HEADING_REVIEW,
  TEXT_REVIEW_DESCRIPTION,
  LABEL_REVIEW_METRIC_SALES,
  LABEL_REVIEW_METRIC_PROFIT,
  LABEL_REVIEW_METRIC_UTANG,
  LABEL_REVIEW_METRIC_INVENTORY,
  TEXT_REVIEW_MARGIN_SUFFIX,
  TEXT_REVIEW_OVERDUE_SUFFIX,
  TEXT_REVIEW_LOW_STOCK_SUFFIX,
  TEXT_REVIEW_TRANSACTIONS_SUFFIX,
  TEXT_REVIEW_PROFIT_PARTIAL_PREFIX,
  TEXT_REVIEW_PROFIT_PARTIAL_SUFFIX,
  TEXT_REVIEW_ERROR_HEADING,
  TEXT_REVIEW_ERROR_BODY,
  BUTTON_TRY_AGAIN,
  PESO,
} from "@/lib";
import { ReviewLockedState, ReviewMetricCard } from "./component";
import { useReviewPage } from "./hooks";

/** "82%" from 0.82, for the profit-coverage caveat. */
function asPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function Review() {
  const { state, summary, retry } = useReviewPage();

  if (state === "locked") {
    return (
      <div className="tpl-root" style={{ padding: 18 }}>
        <ReviewLockedState />
      </div>
    );
  }

  return (
    <div className="tpl-root" style={{ padding: 18 }}>
      <div className="tpl-hd">
        <div>
          <p className="tpl-h1" style={{ fontSize: 21 }}>
            {PAGE_HEADING_REVIEW}
          </p>
          <p className="tpl-sub">{TEXT_REVIEW_DESCRIPTION}</p>
        </div>
      </div>

      {state === "loading" && (
        // Skeletons rather than a spinner, and the same count and shape as the
        // real row, so the page does not jump when the figures arrive.
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tpl-card" style={{ marginBottom: 0, minHeight: 92 }}>
              <div className="tpl-skel" style={{ width: "45%", height: 10, marginBottom: 10 }} />
              <div className="tpl-skel" style={{ width: "70%", height: 20 }} />
            </div>
          ))}
        </div>
      )}

      {state === "error" && (
        // Deliberately plain. Whatever the server said stays in the console:
        // a shop owner cannot act on a Postgres message, and it should not
        // describe our schema to them.
        <div className="tpl-card" style={{ textAlign: "center", padding: 28 }}>
          <p className="tpl-h3" style={{ marginBottom: 6 }}>
            {TEXT_REVIEW_ERROR_HEADING}
          </p>
          <p className="tpl-sub" style={{ marginBottom: 18 }}>
            {TEXT_REVIEW_ERROR_BODY}
          </p>
          <button type="button" className="tpl-btnp" style={{ marginBottom: 0 }} onClick={() => void retry()}>
            {BUTTON_TRY_AGAIN}
          </button>
        </div>
      )}

      {state === "ready" && summary && (
        // Four metrics, not the design's five. EXPENSES is absent because this
        // schema has no expenses table -- review_summary() does not return the
        // key and a pgTAP assertion keeps it that way, so there is nothing to
        // render a card over. Adding it needs expense records first.
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReviewMetricCard
            label={LABEL_REVIEW_METRIC_SALES}
            value={PESO.format(summary.salesTotal)}
            detail={`${summary.transactionCount} ${TEXT_REVIEW_TRANSACTIONS_SUFFIX}`}
          />
          <ReviewMetricCard
            label={LABEL_REVIEW_METRIC_PROFIT}
            value={PESO.format(summary.estimatedProfit)}
            // The caveat wins over the margin when the basis is incomplete:
            // a margin computed from 40% of sales is not a margin.
            detail={
              summary.profitBasisShare < 1
                ? `${TEXT_REVIEW_PROFIT_PARTIAL_PREFIX} ${asPercent(summary.profitBasisShare)} ${TEXT_REVIEW_PROFIT_PARTIAL_SUFFIX}`
                : summary.salesTotal > 0
                  ? `${asPercent(summary.estimatedProfit / summary.salesTotal)} ${TEXT_REVIEW_MARGIN_SUFFIX}`
                  : undefined
            }
            detailIsCaveat={summary.profitBasisShare < 1}
          />
          <ReviewMetricCard
            label={LABEL_REVIEW_METRIC_UTANG}
            value={PESO.format(summary.utangOutstanding)}
            detail={
              summary.overdueCustomerCount > 0
                ? `${summary.overdueCustomerCount} ${TEXT_REVIEW_OVERDUE_SUFFIX}`
                : undefined
            }
            detailIsCaveat={summary.overdueCustomerCount > 0}
          />
          <ReviewMetricCard
            label={LABEL_REVIEW_METRIC_INVENTORY}
            value={PESO.format(summary.inventoryValue)}
            detail={
              summary.lowStockCount > 0
                ? `${summary.lowStockCount} ${TEXT_REVIEW_LOW_STOCK_SUFFIX}`
                : undefined
            }
            detailIsCaveat={summary.lowStockCount > 0}
          />
        </div>
      )}
    </div>
  );
}
