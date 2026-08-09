import {
  PESO,
  LABEL_SALES_LIST,
  TEXT_NO_SALES_IN_RANGE,
  COLUMN_DATE,
  COLUMN_CASHIER,
  COLUMN_ITEMS,
  COLUMN_PAYMENT,
  COLUMN_TOTAL,
  LABEL_PAYMENT_CASH,
  LABEL_PAYMENT_QR,
  LABEL_PAYMENT_UTANG,
  type SaleRecord,
  type PaymentType,
} from "@/lib";

const COLUMNS = "140px 1fr 1fr 90px 100px";

const PAYMENT_LABEL: Record<PaymentType, string> = {
  cash: LABEL_PAYMENT_CASH,
  qr: LABEL_PAYMENT_QR,
  credit: LABEL_PAYMENT_UTANG,
};

function formatSaleDate(timestamp: string): string {
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

interface SalesTableProps {
  sales: SaleRecord[];
}

export function SalesTable({ sales }: SalesTableProps) {
  return (
    <div className="tpl-card" style={{ padding: 0 }}>
      <p className="tpl-h2" style={{ padding: "14px 15px 0" }}>
        {LABEL_SALES_LIST}
      </p>
      <div className="tpl-thead" style={{ gridTemplateColumns: COLUMNS }}>
        <span>{COLUMN_DATE}</span>
        <span>{COLUMN_CASHIER}</span>
        <span>{COLUMN_ITEMS}</span>
        <span>{COLUMN_PAYMENT}</span>
        <span className="tpl-right">{COLUMN_TOTAL}</span>
      </div>

      {sales.length === 0 && (
        <p className="tpl-ts" style={{ padding: "24px 15px", textAlign: "center" }}>
          {TEXT_NO_SALES_IN_RANGE}
        </p>
      )}

      {sales.map((sale) => (
        <div key={sale.id} className="tpl-trow" style={{ gridTemplateColumns: COLUMNS }}>
          <span className="tpl-ts">{formatSaleDate(sale.timestamp)}</span>
          <span className="tpl-tp">{sale.cashierName}</span>
          <span className="tpl-ts">{formatItems(sale)}</span>
          <span className="tpl-tp">{PAYMENT_LABEL[sale.paymentType]}</span>
          <span className="tpl-ts tpl-right">{PESO.format(sale.total)}</span>
        </div>
      ))}
    </div>
  );
}
