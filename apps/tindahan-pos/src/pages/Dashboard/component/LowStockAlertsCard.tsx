import type { Product } from "@/lib";
import {
  stockStatus,
  LABEL_LOW_STOCK_ALERTS,
  TABLE_HEADER_PRODUCT,
  LABEL_CATEGORY,
  TABLE_HEADER_STOCK,
  TABLE_HEADER_THRESHOLD,
  TABLE_HEADER_STATUS,
  LABEL_STATUS_OUT_OF_STOCK,
  LABEL_STATUS_LOW_STOCK,
  EMPTY_STATE_ALL_STOCKED,
  TEXT_STOCK_LEFT_SUFFIX,
} from "@/lib";
import type { CardSection } from "@/lib/reportPdf";
import { SectionCardHeader, type CardActions } from "@/components";

interface LowStockAlertsCardProps {
  lowStock: Product[];
  buildCardActions: (section: CardSection) => CardActions;
}

export function LowStockAlertsCard({ lowStock, buildCardActions }: LowStockAlertsCardProps) {
  return (
    <div className="card">
      <SectionCardHeader
        title={LABEL_LOW_STOCK_ALERTS}
        {...buildCardActions({
          kind: "table",
          title: LABEL_LOW_STOCK_ALERTS,
          head: [TABLE_HEADER_PRODUCT, LABEL_CATEGORY, TABLE_HEADER_STOCK, TABLE_HEADER_THRESHOLD, TABLE_HEADER_STATUS],
          rows: lowStock.map((p) => [
            p.name,
            p.category,
            String(p.stock),
            String(p.lowStockThreshold),
            stockStatus(p) === "out" ? LABEL_STATUS_OUT_OF_STOCK : LABEL_STATUS_LOW_STOCK,
          ]),
          emptyMessage: EMPTY_STATE_ALL_STOCKED,
          dangerColumn: 4,
          dangerValue: LABEL_STATUS_OUT_OF_STOCK,
        })}
      />
      <ul className="divide-y divide-slate-100">
        {lowStock.slice(0, 8).map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-slate-800">{p.name}</p>
              <p className="text-xs text-slate-500">{p.category}</p>
            </div>
            <span
              className={`tabular-nums text-sm font-semibold ${
                stockStatus(p) === "out" ? "text-red-600" : "text-amber-600"
              }`}
            >
              {p.stock} {TEXT_STOCK_LEFT_SUFFIX}
            </span>
          </li>
        ))}
        {lowStock.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_ALL_STOCKED}</li>
        )}
      </ul>
    </div>
  );
}
