import type { CartLine, Product, ServiceLine } from "@/lib";
import { PESO, EMPTY_STATE_CART, TEXT_EACH_SUFFIX, ARIA_DECREASE_QUANTITY_PREFIX, ARIA_INCREASE_QUANTITY_PREFIX, ARIA_REMOVE_PREFIX, BUTTON_REMOVE } from "@/lib";
import { lineTotal } from "@/lib/pos";

interface CartItemsListProps {
  cart: CartLine[];
  serviceLines: ServiceLine[];
  packPricingEnabled: boolean;
  priceLabel: (product: Product) => string | null;
  onIncrement: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onRemoveService: (id: string) => void;
}

export function CartItemsList({
  cart,
  serviceLines,
  packPricingEnabled,
  priceLabel,
  onIncrement,
  onRemove,
  onRemoveService,
}: CartItemsListProps) {
  if (cart.length === 0 && serviceLines.length === 0) {
    return (
      <p className="tpl-ts" style={{ padding: "16px 0" }}>
        {EMPTY_STATE_CART}
      </p>
    );
  }

  return (
    <ul className="flex flex-col" aria-label="Cart items">
      {serviceLines.map((line) => {
        const [title, ...rest] = line.label.split(" · ");
        const detail = rest.join(" · ");
        return (
          <li key={line.id} className="tpl-lr" style={{ alignItems: "flex-start" }}>
            <div className="tpl-flex1">
              <p className="tpl-tp">{title}</p>
              {detail && (
                <p className="tpl-ts tpl-mono" style={{ margin: 0 }}>
                  {detail}
                </p>
              )}
              {line.fee > 0 && (
                <p className="tpl-ts" style={{ color: "var(--tpl-ok)", margin: 0 }}>
                  fee {PESO.format(line.fee)}
                </p>
              )}
            </div>
            <div className="tpl-row">
              <span className="tpl-tp">{PESO.format(line.amount + line.fee)}</span>
              <button
                type="button"
                aria-label={`${ARIA_REMOVE_PREFIX} ${line.label}`}
                onClick={() => onRemoveService(line.id)}
                style={{ color: "var(--tpl-bad)", fontSize: 12, background: "none", border: "none", cursor: "pointer" }}
              >
                {BUTTON_REMOVE}
              </button>
            </div>
          </li>
        );
      })}
      {cart.map((line) => (
        <li key={line.product.id} className="tpl-lr">
          <div className="tpl-flex1">
            <p className="tpl-tp">{line.product.name}</p>
            <p className="tpl-ts" style={{ margin: 0 }}>
              {priceLabel(line.product) ?? `${PESO.format(line.product.price)} ${TEXT_EACH_SUFFIX}`} ·{" "}
              {PESO.format(lineTotal(line.product, line.quantity, packPricingEnabled))}
            </p>
          </div>
          <div className="tpl-row" style={{ gap: 4 }}>
            <button
              type="button"
              aria-label={`${ARIA_DECREASE_QUANTITY_PREFIX} ${line.product.name}`}
              onClick={() => onIncrement(line.product.id, line.quantity - 1)}
              className="tpl-opt"
              style={{ width: 34 }}
            >
              −
            </button>
            <span className="tpl-tp" style={{ width: 20, textAlign: "center" }}>
              {line.quantity}
            </span>
            <button
              type="button"
              aria-label={`${ARIA_INCREASE_QUANTITY_PREFIX} ${line.product.name}`}
              onClick={() => onIncrement(line.product.id, line.quantity + 1)}
              className="tpl-opt"
              style={{ width: 34 }}
            >
              +
            </button>
            <button
              type="button"
              aria-label={`${ARIA_REMOVE_PREFIX} ${line.product.name}`}
              onClick={() => onRemove(line.product.id)}
              style={{ color: "var(--tpl-bad)", fontSize: 12, background: "none", border: "none", cursor: "pointer", padding: "0 6px" }}
            >
              {BUTTON_REMOVE}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
