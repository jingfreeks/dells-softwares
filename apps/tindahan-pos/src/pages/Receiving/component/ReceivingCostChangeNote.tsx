import { useState } from "react";
import type { Product } from "@/lib";
import { PESO, roundMoney, TITLE_COST_PRICES_CHANGED, TITLE_COST_PRICE_CHANGED, BUTTON_RAISE_SELLING_PRICE, BUTTON_KEEP_PRICE_PREFIX } from "@/lib";
import type { DraftLine } from "../hooks";

interface ReceivingCostChangeNoteProps {
  products: Product[];
  lines: DraftLine[];
  previousCostFor: (productId: string) => number | null;
  onRaisePrice: (productId: string, newPrice: number) => void;
}

export function ReceivingCostChangeNote({ products, lines, previousCostFor, onRaisePrice }: ReceivingCostChangeNoteProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const changed = lines
    .map((line) => {
      const product = products.find((p) => p.id === line.productId);
      const previousCost = previousCostFor(line.productId);
      const costEach = Number(line.costEach) || 0;
      if (!product || previousCost === null || costEach === previousCost || dismissed.has(line.productId)) {
        return null;
      }
      return { product, previousCost, costEach };
    })
    .filter((v): v is { product: Product; previousCost: number; costEach: number } => v !== null);

  if (changed.length === 0) return null;

  return (
    <div className="tpl-note tpl-w" style={{ marginTop: 14, display: "block" }}>
      <p className="tpl-nt tpl-warn" style={{ marginBottom: 8 }}>
        {changed.length > 1 ? TITLE_COST_PRICES_CHANGED : TITLE_COST_PRICE_CHANGED}
      </p>
      {changed.map(({ product, previousCost, costEach }) => {
        const delta = costEach - previousCost;
        const suggestedPrice = roundMoney(product.price + delta);
        return (
          <div key={product.id} className="tpl-sp" style={{ padding: "6px 0", alignItems: "center" }}>
            <p className="tpl-ns" style={{ color: "var(--tpl-warnd)" }}>
              {product.name} {delta > 0 ? "went up" : "went down"} {PESO.format(Math.abs(delta))}. Currently{" "}
              {PESO.format(product.price)}.
            </p>
            <div className="tpl-row" style={{ gap: 8, marginBottom: 0, width: "auto" }}>
              <span
                role="button"
                tabIndex={0}
                className="tpl-chip tpl-w"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  onRaisePrice(product.id, suggestedPrice);
                  setDismissed((prev) => new Set(prev).add(product.id));
                }}
                onKeyDown={(e) =>
                  e.key === "Enter" && (onRaisePrice(product.id, suggestedPrice), setDismissed((prev) => new Set(prev).add(product.id)))
                }
              >
                {BUTTON_RAISE_SELLING_PRICE}
              </span>
              <span
                role="button"
                tabIndex={0}
                className="tpl-chip"
                style={{ cursor: "pointer" }}
                onClick={() => setDismissed((prev) => new Set(prev).add(product.id))}
                onKeyDown={(e) => e.key === "Enter" && setDismissed((prev) => new Set(prev).add(product.id))}
              >
                {BUTTON_KEEP_PRICE_PREFIX}
                {product.price.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
