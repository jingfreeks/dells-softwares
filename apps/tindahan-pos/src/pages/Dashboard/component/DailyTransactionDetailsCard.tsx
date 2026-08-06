import { PESO, type Customer, type PaymentType, type SaleRecord } from "@/lib";

const PAYMENT_LABEL: Record<PaymentType, string> = {
  cash: "Cash",
  credit: "Utang",
  qr: "Digital wallet",
};

function transactionNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface DailyTransactionDetailsCardProps {
  sales: SaleRecord[];
  customers: Customer[];
}

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
      <div className="tpl-sp" style={{ marginBottom: 12 }}>
        <p className="tpl-h3">Daily sales transactions</p>
        <span className="tpl-ts">{sales.length} transaction{sales.length === 1 ? "" : "s"}</span>
      </div>

      {sales.length === 0 ? (
        <p className="tpl-ts" style={{ padding: "12px 0", textAlign: "center" }}>No transactions today.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sales.map((sale) => {
            const number = transactionNumber(sale.id);
            return (
              <article key={sale.id} className="tpl-lr" style={{ display: "block", padding: 12 }}>
                <div className="tpl-sp" style={{ alignItems: "start" }}>
                  <div>
                    <p className="tpl-tp">Transaction #{number}</p>
                    <p className="tpl-ts">Invoice INV-{number} · {formatDateTime(sale.timestamp)}</p>
                  </div>
                  <span className="tpl-tp">{PESO.format(sale.total)}</span>
                </div>
                <p className="tpl-ts" style={{ marginTop: 6 }}>
                  Cashier: {sale.cashierName} · Customer: {sale.customerId ? (customerNameById.get(sale.customerId) ?? "Unknown") : "Walk-in"} · {PAYMENT_LABEL[sale.paymentType]} · Status: Completed
                </p>
                <p className="tpl-ts" style={{ marginTop: 4 }}>
                  Discount: {PESO.format(0)} · Tax: {PESO.format(0)}
                </p>
                <div className="tpl-ts" style={{ marginTop: 9 }}>
                  {sale.items.map((item) => (
                    <div key={`${sale.id}-${item.productId}-${item.name}`} className="tpl-sp" style={{ gap: 12 }}>
                      <span>{item.name} · SKU: {item.productId || "—"} · {item.quantity} × {PESO.format(item.price)}</span>
                      <span>{PESO.format(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="tpl-sp" style={{ borderTop: "1px solid var(--tpl-b)", marginTop: 14, paddingTop: 12 }}>
        <span className="tpl-ts">Transaction subtotal: {PESO.format(subtotal)} · Total items sold: {totalItemsSold}</span>
        <strong>Grand total: {PESO.format(subtotal)}</strong>
      </div>
    </section>
  );
}
