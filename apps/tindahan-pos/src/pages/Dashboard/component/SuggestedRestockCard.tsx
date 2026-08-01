import { Link } from "react-router-dom";
import type { RestockSuggestion } from "@/lib/inventory";
import {
  LABEL_SUGGESTED_RESTOCK,
  TEXT_SUGGESTED_RESTOCK_DESCRIPTION,
  TABLE_HEADER_PRODUCT,
  TABLE_HEADER_SUGGESTED_QTY,
  TEXT_DAYS_LEFT_SUFFIX,
  TEXT_UNITS_PER_DAY_SUFFIX,
  EMPTY_STATE_NO_RESTOCK_NEEDED,
  LINK_RECEIVE,
} from "@/lib";
import type { CardSection } from "@/lib/reportPdf";
import { SectionCardHeader, type CardActions } from "@/components";

interface SuggestedRestockCardProps {
  suggestions: RestockSuggestion[];
  buildCardActions: (section: CardSection) => CardActions;
}

export function SuggestedRestockCard({ suggestions, buildCardActions }: SuggestedRestockCardProps) {
  return (
    <div className="card">
      <SectionCardHeader
        title={LABEL_SUGGESTED_RESTOCK}
        {...buildCardActions({
          kind: "table",
          title: LABEL_SUGGESTED_RESTOCK,
          head: [TABLE_HEADER_PRODUCT, TABLE_HEADER_SUGGESTED_QTY],
          rows: suggestions.map((s) => [s.productName, String(s.suggestedQuantity)]),
          emptyMessage: EMPTY_STATE_NO_RESTOCK_NEEDED,
        })}
      />
      <p className="px-4 pt-3 text-xs text-slate-500">{TEXT_SUGGESTED_RESTOCK_DESCRIPTION}</p>
      <ul className="divide-y divide-slate-100">
        {suggestions.slice(0, 8).map((s) => (
          <li key={s.productId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800">{s.productName}</p>
              <p className="text-xs text-slate-500">
                {s.avgDailySales}
                {TEXT_UNITS_PER_DAY_SUFFIX} · {s.daysOfStockLeft} {TEXT_DAYS_LEFT_SUFFIX}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="tabular-nums text-sm font-semibold text-amber-600">+{s.suggestedQuantity}</span>
              <Link
                to="/inventory/receiving"
                state={{
                  prefillProduct: {
                    productId: s.productId,
                    productName: s.productName,
                    quantity: s.suggestedQuantity,
                  },
                }}
                className="cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {LINK_RECEIVE}
              </Link>
            </div>
          </li>
        ))}
        {suggestions.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_NO_RESTOCK_NEEDED}</li>
        )}
      </ul>
    </div>
  );
}
