import type { StockStatus } from "@/lib/inventory";
import { LABEL_STATUS_OK_SHORT, LABEL_STATUS_LOW_SHORT, LABEL_STATUS_OUT_SHORT, LABEL_STATUS_IN_STOCK, LABEL_STATUS_LOW_STOCK, LABEL_STATUS_OUT_OF_STOCK } from "@/lib";

const CHIP_CLASS: Record<StockStatus, string> = {
  "in-stock": "tpl-chip tpl-g",
  low: "tpl-chip tpl-w",
  out: "tpl-chip tpl-bad",
};

const SHORT_LABEL: Record<StockStatus, string> = {
  "in-stock": LABEL_STATUS_OK_SHORT,
  low: LABEL_STATUS_LOW_SHORT,
  out: LABEL_STATUS_OUT_SHORT,
};

const FULL_LABEL: Record<StockStatus, string> = {
  "in-stock": LABEL_STATUS_IN_STOCK,
  low: LABEL_STATUS_LOW_STOCK,
  out: LABEL_STATUS_OUT_OF_STOCK,
};

export function StatusChip({ status }: { status: StockStatus }) {
  return (
    <span
      className={CHIP_CLASS[status]}
      aria-label={FULL_LABEL[status]}
      style={{ justifyContent: "center", fontSize: 11, padding: "3px 0", width: "100%" }}
    >
      {SHORT_LABEL[status]}
    </span>
  );
}
