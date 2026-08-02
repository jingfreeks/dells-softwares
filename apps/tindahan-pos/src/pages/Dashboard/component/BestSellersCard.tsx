import type { BestSeller } from "@/lib";
import { LABEL_BEST_SELLERS, EMPTY_STATE_NO_DATA } from "@/lib";

export function BestSellersCard({ bestSellers }: { bestSellers: BestSeller[] }) {
  const maxQuantity = Math.max(1, ...bestSellers.map((item) => item.quantity));

  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {LABEL_BEST_SELLERS}
      </p>
      {bestSellers.map((item) => (
        <div key={item.name} style={{ marginBottom: 11 }}>
          <div className="tpl-sp" style={{ marginBottom: 5 }}>
            <span style={{ color: "var(--tpl-t3)", fontSize: 13 }}>{item.name}</span>
            <span className="tpl-ts">{item.quantity}</span>
          </div>
          <div className="tpl-bar">
            <i style={{ width: `${(item.quantity / maxQuantity) * 100}%` }} />
          </div>
        </div>
      ))}
      {bestSellers.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_DATA}
        </p>
      )}
    </div>
  );
}
