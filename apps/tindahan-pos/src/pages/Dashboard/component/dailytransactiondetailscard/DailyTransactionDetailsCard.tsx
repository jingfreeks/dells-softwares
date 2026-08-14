import { PESO, EMPTY_STATE_NO_SALES_FOR_DATE } from "@/lib";
import type { SaleRecord } from "@/lib";

interface DailyTransactionDetailsCardProps {
  sales: SaleRecord[];
}

/**
 * Compact summary strip for the selected day's transactions — the full
 * itemized ledger lives in the "Today's Sales"/"Transactions Today"/
 * "Recent Sales" report modal (see ../salesreportmodal), which reuses
 * this folder's header/saleitem/salesitems/totalsales subcomponents for
 * its rows.
 */
export function DailyTransactionDetailsCard({ sales }: DailyTransactionDetailsCardProps) {
  const subtotal = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalItemsSold = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  return (
    <section className="tpl-card" aria-label="Daily sales transactions summary">
      <div className="tpl-sp" style={{ marginBottom: sales.length === 0 ? 11 : 0 }}>
        <p className="tpl-h3">Daily sales transactions</p>
        <span className="tpl-ts">
          {sales.length} transaction{sales.length === 1 ? "" : "s"}
        </span>
      </div>
      {sales.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_SALES_FOR_DATE}
        </p>
      )}
      <p
        className="tpl-hint"
        style={{ borderTop: "0.5px solid var(--tpl-bd3)", paddingTop: 10, marginTop: sales.length === 0 ? 0 : 12 }}
      >
        Transaction subtotal {PESO.format(subtotal)} · total items sold {totalItemsSold}
      </p>
    </section>
  );
}
