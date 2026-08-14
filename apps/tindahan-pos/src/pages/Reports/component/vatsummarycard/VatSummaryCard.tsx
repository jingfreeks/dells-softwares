import {
  PESO,
  LABEL_VAT_SUMMARY,
  LABEL_VATABLE_SALES,
  LABEL_VAT_AMOUNT,
  LABEL_VAT_EXEMPT_SALES,
  LABEL_ZERO_RATED_SALES,
} from "@/lib";
import type { VatSummary } from "@/lib/reports";

interface VatSummaryCardProps {
  summary: VatSummary;
}

export function VatSummaryCard({ summary }: VatSummaryCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_VAT_SUMMARY}
      </p>
      <div className="tpl-g4">
        <div className="tpl-metric">
          <p className="tpl-mlbl">{LABEL_VATABLE_SALES.toUpperCase()}</p>
          <p className="tpl-mval">{PESO.format(summary.vatableSales)}</p>
        </div>
        <div className="tpl-metric">
          <p className="tpl-mlbl">{LABEL_VAT_AMOUNT.toUpperCase()}</p>
          <p className="tpl-mval">{PESO.format(summary.vatAmount)}</p>
        </div>
        <div className="tpl-metric">
          <p className="tpl-mlbl">{LABEL_VAT_EXEMPT_SALES.toUpperCase()}</p>
          <p className="tpl-mval">{PESO.format(summary.vatExemptSales)}</p>
        </div>
        <div className="tpl-metric">
          <p className="tpl-mlbl">{LABEL_ZERO_RATED_SALES.toUpperCase()}</p>
          <p className="tpl-mval">{PESO.format(summary.zeroRatedSales)}</p>
        </div>
      </div>
    </div>
  );
}
