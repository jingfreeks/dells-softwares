import type { BestSeller } from "@/lib";
import { LABEL_BEST_SELLERS, EMPTY_STATE_NO_DATA } from "@/lib";
import { ListItem } from "./listItem";
export function BestSellersCard({
  bestSellers,
}: {
  bestSellers: BestSeller[];
}) {
  const maxQuantity = Math.max(1, ...bestSellers.map((item) => item.quantity));

  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {LABEL_BEST_SELLERS}
      </p>
      {bestSellers.map((item) => (
        <ListItem item={item} maxQuantity={maxQuantity} />
      ))}
      {bestSellers.length === 0 && (
        <p
          className="tpl-ts"
          style={{ padding: "16px 0", textAlign: "center" }}
        >
          {EMPTY_STATE_NO_DATA}
        </p>
      )}
    </div>
  );
}
