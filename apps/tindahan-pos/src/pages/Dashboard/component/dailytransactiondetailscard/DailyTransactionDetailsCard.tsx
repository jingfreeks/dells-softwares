import { Headerscreen,Salesperitem,Salesperitems,Totalsalescreen } from "./component"
import type { DailyTransactionDetailsCardProps } from "./types";
import { transactionNumber } from "./lib";


/** Detailed, read-only transaction ledger for the dashboard's selected day. */
export function DailyTransactionDetailsCard({ sales, customers }: DailyTransactionDetailsCardProps) {
  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.name]));
  const subtotal = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalItemsSold = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  return (
    <section className="tpl-card" aria-label="Daily sales transaction details">
      <Headerscreen sales={sales} />

      {sales.length === 0 ? (
        <p className="tpl-ts" style={{ padding: "12px 0", textAlign: "center" }}>No transactions today.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sales.map((sale) => {
            const number = transactionNumber(sale.id);
            return (
              <article key={sale.id} className="tpl-lr" style={{ display: "block", padding: 12 }}>
                <Salesperitem number={number} sale={sale} />
                <Salesperitems sale={sale} customerNameById={customerNameById} />
              </article>
            );
          })}
        </div>
      )}
      <Totalsalescreen subtotal={subtotal} totalItemsSold={totalItemsSold} />
    </section>
  );
}
