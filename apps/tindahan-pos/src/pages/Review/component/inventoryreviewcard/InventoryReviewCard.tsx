import {
  HEADING_REVIEW_INVENTORY,
  BUTTON_REVIEW_OPEN,
  LABEL_REVIEW_STOCK_HEALTHY,
  LABEL_REVIEW_STOCK_LOW,
  LABEL_REVIEW_STOCK_CRITICAL,
  LABEL_REVIEW_STOCK_SLOW,
  TEXT_REVIEW_RESTOCK_SUFFIX,
  TEXT_REVIEW_NO_PRODUCTS,
  ARIA_REVIEW_STOCK_HEALTH,
} from "@/lib";

interface InventoryReviewCardProps {
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  slowMovingCount: number;
  onOpen: () => void;
}

const SEGMENT_COLORS = {
  healthy: "#4ADE80",
  low: "#FBBF24",
  critical: "#F87171",
  slow: "#94A3B8",
} as const;

/**
 * Stock health as four shares of one bar.
 *
 * "Critical" is out-of-stock, not a third threshold: the schema has one
 * per-product low-stock threshold and a zero, so inventing a middle band would
 * mean inventing a rule the rest of the app does not apply. stockStatus() in
 * src/lib/inventory draws the same line.
 *
 * Healthy is the remainder rather than its own count, so the four always sum to
 * the product count and the bar cannot quietly fail to fill.
 */
export function InventoryReviewCard({
  productCount,
  lowStockCount,
  outOfStockCount,
  slowMovingCount,
  onOpen,
}: InventoryReviewCardProps) {
  // A product can be both slow-moving and low on stock. Slow-moving yields, so
  // no product is counted twice and the shares stay honest.
  const slow = Math.max(0, Math.min(slowMovingCount, productCount - lowStockCount - outOfStockCount));
  const healthy = Math.max(0, productCount - lowStockCount - outOfStockCount - slow);

  const segments = [
    { key: "healthy", label: LABEL_REVIEW_STOCK_HEALTHY, count: healthy, color: SEGMENT_COLORS.healthy },
    { key: "low", label: LABEL_REVIEW_STOCK_LOW, count: lowStockCount, color: SEGMENT_COLORS.low },
    { key: "critical", label: LABEL_REVIEW_STOCK_CRITICAL, count: outOfStockCount, color: SEGMENT_COLORS.critical },
    { key: "slow", label: LABEL_REVIEW_STOCK_SLOW, count: slow, color: SEGMENT_COLORS.slow },
  ];

  const share = (count: number) => (productCount > 0 ? Math.round((count / productCount) * 100) : 0);

  return (
    <div className="tpl-card" style={{ marginBottom: 0 }}>
      <div className="tpl-sp" style={{ marginBottom: 14 }}>
        <p className="tpl-h3" style={{ margin: 0 }}>
          {HEADING_REVIEW_INVENTORY}
        </p>
        <button type="button" className="tpl-txt" onClick={onOpen}>
          {BUTTON_REVIEW_OPEN}
        </button>
      </div>

      {productCount > 0 ? (
        <>
          <div
            role="img"
            aria-label={`${ARIA_REVIEW_STOCK_HEALTH}: ${segments.map((s) => `${s.label} ${share(s.count)}%`).join(", ")}`}
            style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}
          >
            {segments.map((segment) => (
              <span
                key={segment.key}
                aria-hidden
                style={{ width: `${(segment.count / productCount) * 100}%`, background: segment.color }}
              />
            ))}
          </div>

          <div className="tpl-g4" style={{ marginBottom: 12 }}>
            {segments.map((segment) => (
              <div key={segment.key}>
                {/* The dot repeats what the colour says, but the label and the
                    number carry the meaning on their own -- status must not
                    depend on colour alone. */}
                <p className="tpl-ns" style={{ color: "var(--tpl-t5)", margin: 0 }}>
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: segment.color,
                      marginRight: 5,
                    }}
                  />
                  {segment.label}
                </p>
                <p className="tpl-mono" style={{ fontSize: 14, margin: "2px 0 0" }}>
                  {share(segment.count)}%
                </p>
              </div>
            ))}
          </div>

          {lowStockCount + outOfStockCount > 0 && (
            <p className="tpl-ns" style={{ color: "#d9a93b", margin: 0 }}>
              {lowStockCount + outOfStockCount} {TEXT_REVIEW_RESTOCK_SUFFIX}
            </p>
          )}
        </>
      ) : (
        <p className="tpl-sub" style={{ margin: 0 }}>
          {TEXT_REVIEW_NO_PRODUCTS}
        </p>
      )}
    </div>
  );
}
