import {
  PESO,
  LABEL_REFUND_SUMMARY,
  LABEL_REFUNDED_COUNT,
  LABEL_REFUNDED_TOTAL,
  BUTTON_EXPORT_REFUNDS_CSV,
} from "@/lib";
import type { RefundSummary } from "@/lib/reports";

interface RefundSummaryCardProps {
  summary: RefundSummary;
  onExport: () => void;
}

/** Mirrors VoidSummaryCard: refund_sale_items() is append-only and never
 * touches the original sale, so without this card refunded amounts were
 * invisible everywhere in Reports -- not in the summary totals, not in the
 * VAT breakdown, not as a per-row badge, nowhere. */
export function RefundSummaryCard({ summary, onExport }: RefundSummaryCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{LABEL_REFUND_SUMMARY}</p>
        <button type="button" className="tpl-lnk" style={{ fontSize: 12 }} onClick={onExport}>
          {BUTTON_EXPORT_REFUNDS_CSV}
        </button>
      </div>
      <div className="tpl-g4">
        <div className="tpl-metric">
          <p className="tpl-mlbl">{LABEL_REFUNDED_COUNT.toUpperCase()}</p>
          <p className="tpl-mval">{summary.count}</p>
        </div>
        <div className="tpl-metric">
          <p className="tpl-mlbl">{LABEL_REFUNDED_TOTAL.toUpperCase()}</p>
          <p className="tpl-mval">{PESO.format(summary.totalAmount)}</p>
        </div>
      </div>
    </div>
  );
}
