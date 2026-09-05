import {
  HEADING_REVIEW_SALES,
  HEADING_REVIEW_BEST_SELLERS,
  BUTTON_REVIEW_OPEN,
  TEXT_REVIEW_NO_SALES_YET,
  ARIA_REVIEW_SALES_TREND,
  PESO,
  formatDateShort,
} from "@/lib";
import type { ReviewDailySales, ReviewBestSeller } from "@/lib";

interface SalesReviewCardProps {
  daily: ReviewDailySales[];
  bestSellers: ReviewBestSeller[];
  onOpen: () => void;
}

/**
 * Sales trend and best sellers.
 *
 * The chart is plain divs rather than a charting library: it is one series of
 * at most a month of bars, and adding a dependency to draw it would cost more
 * than it saves. It also keeps the accessible summary honest — the bars are
 * decorative, and the real content is the table-shaped label beneath them.
 */
export function SalesReviewCard({ daily, bestSellers, onOpen }: SalesReviewCardProps) {
  const peak = daily.reduce((max, d) => Math.max(max, d.sales), 0);
  const total = daily.reduce((sum, d) => sum + d.sales, 0);

  return (
    <div className="tpl-card" style={{ marginBottom: 0 }}>
      <div className="tpl-sp" style={{ marginBottom: 14 }}>
        <p className="tpl-h3" style={{ margin: 0 }}>
          {HEADING_REVIEW_SALES}
        </p>
        <button type="button" className="tpl-txt" onClick={onOpen}>
          {BUTTON_REVIEW_OPEN}
        </button>
      </div>

      {total > 0 ? (
        <>
          {/*
            A chart nobody can read aloud is a chart half the audience cannot
            use, so the bars are aria-hidden and the group carries a summary
            naming the period and its peak. The design's own accessibility note
            asks for exactly this.
          */}
          <div
            role="img"
            aria-label={`${ARIA_REVIEW_SALES_TREND}: ${PESO.format(total)} across ${daily.length} days, highest ${PESO.format(peak)}`}
            style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64, marginBottom: 14 }}
          >
            {daily.map((d) => (
              <span
                key={d.date}
                aria-hidden
                title={`${formatDateShort(d.date)} · ${PESO.format(d.sales)}`}
                style={{
                  flex: 1,
                  // A day with no sales keeps its column at a hairline rather
                  // than vanishing: an absent bar and a zero bar mean different
                  // things, and only one of them is true.
                  height: peak > 0 ? `${Math.max((d.sales / peak) * 100, 2)}%` : "2%",
                  background:
                    d.sales > 0 ? "linear-gradient(180deg, var(--tpl-a1), #60a5fa)" : "rgba(255,255,255,0.10)",
                  borderRadius: 2,
                  minWidth: 3,
                }}
              />
            ))}
          </div>

          <p className="tpl-lbl" style={{ marginBottom: 8 }}>
            {HEADING_REVIEW_BEST_SELLERS}
          </p>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {bestSellers.map((product, index) => (
              <li key={product.id} className="tpl-sp" style={{ padding: "5px 0", gap: 10 }}>
                <span className="tpl-flex1" style={{ display: "flex", gap: 10, minWidth: 0 }}>
                  <span className="tpl-mono" style={{ color: "var(--tpl-t5)", fontSize: 12 }}>
                    {index + 1}
                  </span>
                  <span
                    style={{
                      color: "var(--tpl-t4)",
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {product.name}
                  </span>
                </span>
                <span className="tpl-mono" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                  {PESO.format(product.revenue)}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="tpl-sub" style={{ margin: 0 }}>
          {TEXT_REVIEW_NO_SALES_YET}
        </p>
      )}
    </div>
  );
}
