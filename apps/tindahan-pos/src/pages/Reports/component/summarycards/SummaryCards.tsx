import { PESO, LABEL_TOTAL_SALES, LABEL_TRANSACTIONS, LABEL_AVERAGE_SALE } from "@/lib";
import type { RangeReport } from "@/lib/reports";

interface SummaryCardsProps {
  report: RangeReport;
}

export function SummaryCards({ report }: SummaryCardsProps) {
  return (
    <div className="tpl-g4">
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_TOTAL_SALES.toUpperCase()}</p>
        <p className="tpl-mval">{PESO.format(report.totalSales)}</p>
      </div>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_TRANSACTIONS.toUpperCase()}</p>
        <p className="tpl-mval">{report.transactionCount}</p>
      </div>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_AVERAGE_SALE.toUpperCase()}</p>
        <p className="tpl-mval">{PESO.format(report.averageSale)}</p>
      </div>
    </div>
  );
}
