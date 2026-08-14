import type { BestSeller } from "@/lib";
import { LABEL_BEST_SELLERS, EMPTY_STATE_NO_DATA, LINK_OPEN } from "@/lib";
import { ListItem } from "./listItem";

export function BestSellersCard({
  bestSellers,
  onOpenReport,
}: {
  bestSellers: BestSeller[];
  onOpenReport: () => void;
}) {
  const maxQuantity = Math.max(1, ...bestSellers.map((item) => item.quantity));

  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 14 }}>
        <p className="tpl-h3">{LABEL_BEST_SELLERS}</p>
        <span
          role="button"
          tabIndex={0}
          className="tpl-chip"
          style={{ fontSize: 10.5, padding: "3px 9px", gap: 4, cursor: "pointer" }}
          onClick={onOpenReport}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenReport()}
        >
          {LINK_OPEN} <i className="ti ti-arrow-right" aria-hidden style={{ fontSize: 11 }} />
        </span>
      </div>
      {bestSellers.map((item) => (
        <ListItem key={item.productId} item={item} maxQuantity={maxQuantity} />
      ))}
      {bestSellers.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_DATA}
        </p>
      )}
    </div>
  );
}
