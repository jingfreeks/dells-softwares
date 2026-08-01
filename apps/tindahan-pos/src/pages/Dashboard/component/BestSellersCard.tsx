import type { BestSeller } from "@/lib";
import { LABEL_BEST_SELLERS, TABLE_HEADER_PRODUCT, TABLE_HEADER_UNITS_SOLD, TEXT_SOLD_SUFFIX, EMPTY_STATE_NO_SALES, EMPTY_STATE_NO_DATA } from "@/lib";
import type { CardSection } from "@/lib/reportPdf";
import { SectionCardHeader, type CardActions } from "@/components";

interface BestSellersCardProps {
  bestSellers: BestSeller[];
  buildCardActions: (section: CardSection) => CardActions;
}

export function BestSellersCard({ bestSellers, buildCardActions }: BestSellersCardProps) {
  return (
    <div className="card">
      <SectionCardHeader
        title={LABEL_BEST_SELLERS}
        {...buildCardActions({
          kind: "table",
          title: LABEL_BEST_SELLERS,
          head: ["#", TABLE_HEADER_PRODUCT, TABLE_HEADER_UNITS_SOLD],
          rows: bestSellers.map((item, i) => [String(i + 1), item.name, String(item.quantity)]),
          emptyMessage: EMPTY_STATE_NO_SALES,
        })}
      />
      <ul className="divide-y divide-slate-100">
        {bestSellers.map((item, i) => (
          <li key={item.name} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-slate-700">
              <span className="mr-2 text-slate-400">{i + 1}.</span>
              {item.name}
            </span>
            <span className="text-slate-500">
              {item.quantity} {TEXT_SOLD_SUFFIX}
            </span>
          </li>
        ))}
        {bestSellers.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_NO_DATA}</li>
        )}
      </ul>
    </div>
  );
}
