import type { SalesByCategory } from "@/lib";
import { PESO, LABEL_SALES_BY_CATEGORY, LABEL_CATEGORY, TABLE_HEADER_TOTAL, EMPTY_STATE_NO_DATA } from "@/lib";
import type { CardSection } from "@/lib/reportPdf";
import { SectionCardHeader, type CardActions } from "@/components";

interface SalesByCategoryCardProps {
  categoryTotals: SalesByCategory;
  buildCardActions: (section: CardSection) => CardActions;
}

export function SalesByCategoryCard({ categoryTotals, buildCardActions }: SalesByCategoryCardProps) {
  return (
    <div className="card">
      <SectionCardHeader
        title={LABEL_SALES_BY_CATEGORY}
        {...buildCardActions({
          kind: "table",
          title: LABEL_SALES_BY_CATEGORY,
          head: [LABEL_CATEGORY, TABLE_HEADER_TOTAL],
          rows: categoryTotals.rows.map((row) => [row.category, PESO.format(row.total)]),
          emptyMessage: EMPTY_STATE_NO_DATA,
        })}
      />
      <ul className="divide-y divide-slate-100">
        {categoryTotals.rows.map((row) => {
          const pct = categoryTotals.grandTotal > 0 ? (row.total / categoryTotals.grandTotal) * 100 : 0;
          return (
            <li key={row.category} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-700">{row.category}</span>
                <span className="tabular-nums font-medium text-slate-900">{PESO.format(row.total)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[var(--color-brand)]" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
        {categoryTotals.rows.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_NO_DATA}</li>
        )}
      </ul>
    </div>
  );
}
