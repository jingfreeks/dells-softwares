import type { PaymentType, SaleRecord } from "@/lib";
import { PESO, LABEL_RECENT_SALES, EMPTY_STATE_NO_SALES } from "@/lib";

const PAYMENT_LABEL: Record<PaymentType, string> = { cash: "Cash", qr: "GCash", credit: "Utang" };

function formatSaleDate(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatItems(sale: SaleRecord): string {
  return sale.items.map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name)).join(", ");
}

export function RecentSalesCard({ recentSales }: { recentSales: SaleRecord[] }) {
  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_RECENT_SALES}
      </p>
      {recentSales.map((sale) => (
        <div className="tpl-lr" key={sale.id}>
          <div className="tpl-flex1">
            <p className="tpl-tp">{formatItems(sale)}</p>
            <p className="tpl-ts">
              {formatSaleDate(sale.timestamp)} · {PAYMENT_LABEL[sale.paymentType]}
            </p>
          </div>
          <span className="tpl-tp">{PESO.format(sale.total)}</span>
        </div>
      ))}
      {recentSales.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_SALES}
        </p>
      )}
    </div>
  );
}
