import { PESO, LABEL_TOTAL_OUTSTANDING, NAV_LABEL_CUSTOMERS } from "@/lib";

interface SummaryCardsProps {
  totalOutstanding: number;
  customerCount: number;
  customersWithBalance: number;
}

export function SummaryCards({ totalOutstanding, customerCount, customersWithBalance }: SummaryCardsProps) {
  const averageBalance = customersWithBalance > 0 ? totalOutstanding / customersWithBalance : 0;
  return (
    <div className="tpl-g4" style={{ marginTop: 18, marginBottom: 14 }}>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{LABEL_TOTAL_OUTSTANDING}</p>
        <p className="tpl-mval">{PESO.format(totalOutstanding)}</p>
        <p className="tpl-mfoot">across active balances</p>
      </div>
      <div className="tpl-metric tpl-w">
        <p className="tpl-mlbl" style={{ color: "var(--tpl-warn)" }}>HAS UTANG</p>
        <p className="tpl-mval tpl-warn">{customersWithBalance}</p>
        <p className="tpl-mfoot" style={{ color: "var(--tpl-warn)" }}>needs collection</p>
      </div>
      <div className="tpl-metric">
        <p className="tpl-mlbl">{NAV_LABEL_CUSTOMERS.toUpperCase()}</p>
        <p className="tpl-mval">{customerCount}</p>
        <p className="tpl-mfoot">registered customers</p>
      </div>
      <div className="tpl-metric">
        <p className="tpl-mlbl">AVG BALANCE</p>
        <p className="tpl-mval">{PESO.format(averageBalance)}</p>
        <p className="tpl-mfoot">per active balance</p>
      </div>
    </div>
  );
}
