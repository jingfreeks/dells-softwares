import type { Product } from "@/lib";
import { stockStatus } from "@/lib/inventory";
import { stockEtaCaption } from "../../lib";

const FILL_CLASS = {
  "in-stock": "",
  low: "tpl-w",
  out: "tpl-r",
} as const;

/**
 * Bar fill relative to a rough "well-stocked" reference of 4x the
 * product's own low-stock threshold — there's no separate "target
 * stock level" field to draw on, so this is a heuristic, not a stored
 * value. Floors at 4% so an out-of-stock row still shows a visible
 * (empty-looking) track instead of nothing.
 */
function stockPercent(product: Product): number {
  if (product.stock <= 0) return 4;
  const target = Math.max(1, product.lowStockThreshold * 4);
  return Math.max(4, Math.min(100, Math.round((product.stock / target) * 100)));
}

interface StockIndicatorProps {
  product: Product;
  avgDailySales: number | undefined;
}

export function StockIndicator({ product, avgDailySales }: StockIndicatorProps) {
  const status = stockStatus(product);
  return (
    <div>
      <div className="tpl-bar" style={{ marginBottom: 4 }}>
        <i className={FILL_CLASS[status]} style={{ width: `${stockPercent(product)}%` }} />
      </div>
      <p className="tpl-ts">{stockEtaCaption(product, avgDailySales)}</p>
    </div>
  );
}
