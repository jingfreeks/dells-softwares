import {
  PESO,
  LABEL_VAT_SUMMARY,
  LABEL_VATABLE_SALES,
  LABEL_VAT_AMOUNT,
  LABEL_VAT_EXEMPT_SALES,
  LABEL_ZERO_RATED_SALES,
  TEXT_NOT_VAT_REGISTERED,
  BUTTON_EXPORT_VAT_CSV,
  type VatStatus,
} from "@/lib";
import type { VatSummary } from "@/lib/reports";

interface VatSummaryCardProps {
  summary: VatSummary;
  /** Store's current VAT registration — shows the same disclosure the
   * receipt itself already uses (Receipt.tsx) rather than hiding the
   * card entirely for a non-VAT store. */
  vatStatus: VatStatus | null;
  onExport: () => void;
}

export function VatSummaryCard({ summary, vatStatus, onExport }: VatSummaryCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{LABEL_VAT_SUMMARY}</p>
        <button type="button" className="tpl-lnk" style={{ fontSize: 12 }} onClick={onExport}>
          {BUTTON_EXPORT_VAT_CSV}
        </button>
      </div>
      {(vatStatus === "non_vat" || vatStatus === null) && (
        <p className="tpl-ts" style={{ marginBottom: 11 }}>
          {TEXT_NOT_VAT_REGISTERED}
        </p>
      )}
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
