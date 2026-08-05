import {
  type StockStatus,
  LABEL_STATUS_IN_STOCK,
  LABEL_STATUS_LOW_STOCK,
  LABEL_STATUS_OUT_OF_STOCK,
} from "@/lib";

const DOT_STYLES: Record<StockStatus, string> = {
  "in-stock": "bg-emerald-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

const TEXT_STYLES: Record<StockStatus, string> = {
  "in-stock": "text-emerald-700",
  low: "text-amber-700",
  out: "text-red-700",
};

const LABELS: Record<StockStatus, string> = {
  "in-stock": LABEL_STATUS_IN_STOCK,
  low: LABEL_STATUS_LOW_STOCK,
  out: LABEL_STATUS_OUT_OF_STOCK,
};

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TEXT_STYLES[status]}`}>
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_STYLES[status]}`} />
      {LABELS[status]}
    </span>
  );
}
