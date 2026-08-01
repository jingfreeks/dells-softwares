import type { SaleRecord } from "@/lib";
import { PESO, LABEL_RECENT_SALES, TABLE_HEADER_DATE_TIME, TABLE_HEADER_CASHIER, TABLE_HEADER_ITEMS, TABLE_HEADER_TOTAL, EMPTY_STATE_NO_SALES } from "@/lib";
import type { CardSection } from "@/lib/reportPdf";
import { SectionCardHeader, type CardActions } from "@/components";

interface RecentSalesCardProps {
  recentSales: SaleRecord[];
  buildCardActions: (section: CardSection) => CardActions;
}

function formatSaleDate(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecentSalesCard({ recentSales, buildCardActions }: RecentSalesCardProps) {
  return (
    <div className="card">
      <SectionCardHeader
        title={LABEL_RECENT_SALES}
        {...buildCardActions({
          kind: "table",
          title: LABEL_RECENT_SALES,
          head: [TABLE_HEADER_DATE_TIME, TABLE_HEADER_CASHIER, TABLE_HEADER_ITEMS, TABLE_HEADER_TOTAL],
          rows: recentSales.map((sale) => [
            new Date(sale.timestamp).toLocaleString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            sale.cashierName,
            String(sale.items.length),
            PESO.format(sale.total),
          ]),
          emptyMessage: EMPTY_STATE_NO_SALES,
        })}
      />
      <ul className="divide-y divide-slate-100">
        {recentSales.map((sale) => (
          <li key={sale.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-800">{formatSaleDate(sale.timestamp)}</p>
              <p className="text-xs text-slate-500">
                {sale.items.length} item{sale.items.length === 1 ? "" : "s"} · {sale.cashierName}
              </p>
            </div>
            <span className="tabular-nums font-semibold text-slate-900">{PESO.format(sale.total)}</span>
          </li>
        ))}
        {recentSales.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_NO_SALES}</li>
        )}
      </ul>
    </div>
  );
}
