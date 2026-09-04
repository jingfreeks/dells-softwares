import { ReportDetailModal } from "@/components";
import {
  PESO,
  printReport,
  LABEL_TODAYS_SALES,
  LABEL_TRANSACTIONS_TODAY,
  LABEL_RECENT_SALES,
  LABEL_TOTAL_SALES,
  LABEL_TRANSACTIONS,
  LABEL_ITEMS_SOLD,
  LABEL_AVERAGE_BASKET,
  TABLE_HEADER_REFERENCE,
  TABLE_HEADER_DATE_TIME,
  TABLE_HEADER_CASHIER,
  TABLE_HEADER_ITEM,
  TABLE_HEADER_QTY,
  TABLE_HEADER_PRICE,
  COLUMN_PAYMENT,
  TABLE_HEADER_TOTAL,
  EMPTY_STATE_NO_SALES_FOR_DATE,
  EMPTY_STATE_NO_RECENT_SALES,
} from "@/lib";
import type { Customer, SaleRecord } from "@/lib";
import { Salesperitem, Salesperitems, Totalsalescreen } from "../dailytransactiondetailscard/component";
import { formatDateTime } from "@/lib";
import { transactionNumber, PAYMENT_LABEL } from "../dailytransactiondetailscard/lib";
import type { DashboardReportKind } from "../../hooks";

const TITLE_BY_KIND: Record<"todaysSales" | "transactionsToday" | "recentSales", string> = {
  todaysSales: LABEL_TODAYS_SALES,
  transactionsToday: LABEL_TRANSACTIONS_TODAY,
  recentSales: LABEL_RECENT_SALES,
};

interface SalesReportModalProps {
  titleKind: Extract<DashboardReportKind, "todaysSales" | "transactionsToday" | "recentSales">;
  dateLabel: string;
  storeName: string;
  storeAddress: string | null;
  printedByName: string;
  sales: SaleRecord[];
  customers: Customer[];
  onClose: () => void;
}

export function SalesReportModal({
  titleKind,
  dateLabel,
  storeName,
  storeAddress,
  printedByName,
  sales,
  customers,
  onClose,
}: SalesReportModalProps) {
  const customerNameById = new Map(customers.map((c) => [c.id, c.name]));
  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const itemsSold = sales.reduce((sum, s) => sum + s.items.reduce((n, item) => n + item.quantity, 0), 0);
  const averageBasket = sales.length > 0 ? totalSales / sales.length : 0;
  const emptyMessage = titleKind === "recentSales" ? EMPTY_STATE_NO_RECENT_SALES : EMPTY_STATE_NO_SALES_FOR_DATE;

  function handlePrint() {
    const rows: string[][] = [];
    for (const sale of sales) {
      for (const item of sale.items) {
        rows.push([
          transactionNumber(sale.id),
          formatDateTime(sale.timestamp),
          sale.cashierName,
          item.name,
          String(item.quantity),
          PESO.format(item.price),
          PAYMENT_LABEL[sale.paymentType],
          PESO.format(item.lineTotal ?? item.quantity * item.price + item.fee),
        ]);
      }
    }
    const byPayment = new Map<string, number>();
    for (const sale of sales) {
      const label = PAYMENT_LABEL[sale.paymentType];
      byPayment.set(label, (byPayment.get(label) ?? 0) + sale.total);
    }
    const paymentBreakdown = Array.from(byPayment, ([label, amount]) => `${label} ${PESO.format(amount)}`).join(" · ");

    printReport({
      storeName,
      storeAddress,
      title: TITLE_BY_KIND[titleKind],
      subtitle: `${dateLabel} · ${storeName}`,
      printedByName,
      summaryTiles: [
        { label: LABEL_TOTAL_SALES, value: PESO.format(totalSales) },
        { label: LABEL_TRANSACTIONS, value: String(sales.length) },
        { label: LABEL_ITEMS_SOLD, value: String(itemsSold) },
        { label: LABEL_AVERAGE_BASKET, value: PESO.format(averageBasket) },
      ],
      columns: [
        { header: TABLE_HEADER_REFERENCE },
        { header: TABLE_HEADER_DATE_TIME },
        { header: TABLE_HEADER_CASHIER },
        { header: TABLE_HEADER_ITEM },
        { header: TABLE_HEADER_QTY, align: "right" },
        { header: TABLE_HEADER_PRICE, align: "right" },
        { header: COLUMN_PAYMENT },
        { header: TABLE_HEADER_TOTAL, align: "right" },
      ],
      rows,
      emptyMessage,
      footerNote: paymentBreakdown ? `${paymentBreakdown} · Total ${PESO.format(totalSales)}` : undefined,
    });
  }

  return (
    <ReportDetailModal
      title={TITLE_BY_KIND[titleKind]}
      subtitle={dateLabel}
      summaryTiles={[
        { label: LABEL_TOTAL_SALES, value: PESO.format(totalSales) },
        { label: LABEL_TRANSACTIONS, value: String(sales.length) },
        { label: LABEL_ITEMS_SOLD, value: String(itemsSold) },
        { label: LABEL_AVERAGE_BASKET, value: PESO.format(averageBasket) },
      ]}
      onClose={onClose}
      onPrint={handlePrint}
    >
      {sales.length === 0 ? (
        <p className="tpl-ts" style={{ padding: "24px 0", textAlign: "center" }}>
          {emptyMessage}
        </p>
      ) : (
        <>
          {sales.map((sale) => (
            <article key={sale.id} className="tpl-lr" style={{ display: "block", padding: 12 }}>
              <Salesperitem number={transactionNumber(sale.id)} sale={sale} />
              <Salesperitems sale={sale} customerNameById={customerNameById} />
            </article>
          ))}
          <Totalsalescreen subtotal={totalSales} totalItemsSold={itemsSold} />
        </>
      )}
    </ReportDetailModal>
  );
}
