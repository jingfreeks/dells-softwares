import type { StockStatus } from "../lib/inventory";

const STYLES: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-50 text-emerald-700",
  low: "bg-amber-50 text-amber-700",
  out: "bg-red-50 text-red-700",
};

const LABELS: Record<StockStatus, string> = {
  "in-stock": "In stock",
  low: "Low stock",
  out: "Out of stock",
};

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
