import {
  PESO,
  LABEL_VOID_SUMMARY,
  LABEL_VOIDED_COUNT,
  LABEL_VOIDED_TOTAL,
  BUTTON_EXPORT_VOIDS_CSV,
} from "@/lib";
import type { VoidSummary } from "@/lib/reports";

interface VoidSummaryCardProps {
  summary: VoidSummary;
  onExport: () => void;
}

/** BIR compliance §39: a standalone void/cancelled-transactions report —
 * voided rows are already visible per-row (with reason) in SalesTable;
 * this is the aggregate/exportable view the audit found missing. */
export function VoidSummaryCard({ summary, onExport }: VoidSummaryCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{LABEL_VOID_SUMMARY}</p>
        <button type="button" className="tpl-lnk" style={{ fontSize: 12 }} onClick={onExport}>
          {BUTTON_EXPORT_VOIDS_CSV}
        </button>
      </div>
      <div className="tpl-g4">
        <div className="tpl-metric">
          <p className="tpl-mlbl">{LABEL_VOIDED_COUNT.toUpperCase()}</p>
          <p className="tpl-mval">{summary.count}</p>
        </div>
        <div className="tpl-metric">
          <p className="tpl-mlbl">{LABEL_VOIDED_TOTAL.toUpperCase()}</p>
          <p className="tpl-mval">{PESO.format(summary.totalAmount)}</p>
        </div>
      </div>
    </div>
  );
}
