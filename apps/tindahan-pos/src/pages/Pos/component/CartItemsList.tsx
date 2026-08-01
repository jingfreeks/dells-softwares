import type { CartLine, Product, ServiceLine } from "@/lib";
import { PESO, EMPTY_STATE_CART, TEXT_EACH_SUFFIX, ARIA_DECREASE_QUANTITY_PREFIX, ARIA_INCREASE_QUANTITY_PREFIX, ARIA_REMOVE_PREFIX, BUTTON_REMOVE, LABEL_SERVICE } from "@/lib";
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
    return <p className="text-sm text-slate-400">{EMPTY_STATE_CART}</p>;
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Cart items">
      {cart.map((line) => (
        <li key={line.product.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{line.product.name}</p>
            <p className="tabular-nums text-xs text-slate-500">
              {priceLabel(line.product) ?? `${PESO.format(line.product.price)} ${TEXT_EACH_SUFFIX}`} ·{" "}
              {PESO.format(lineTotal(line.product, line.quantity, packPricingEnabled))}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`${ARIA_DECREASE_QUANTITY_PREFIX} ${line.product.name}`}
              onClick={() => onIncrement(line.product.id, line.quantity - 1)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded border border-slate-300 text-base hover:bg-slate-100"
            >
              −
            </button>
            <span className="w-6 text-center text-sm">{line.quantity}</span>
            <button
              type="button"
              aria-label={`${ARIA_INCREASE_QUANTITY_PREFIX} ${line.product.name}`}
              onClick={() => onIncrement(line.product.id, line.quantity + 1)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded border border-slate-300 text-base hover:bg-slate-100"
            >
              +
            </button>
            <button
              type="button"
              aria-label={`${ARIA_REMOVE_PREFIX} ${line.product.name}`}
              onClick={() => onRemove(line.product.id)}
              className="flex h-11 min-w-11 cursor-pointer items-center justify-center px-2 text-xs text-red-600 hover:underline"
            >
              {BUTTON_REMOVE}
            </button>
          </div>
        </li>
      ))}
      {serviceLines.map((line) => (
        <li key={line.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl bg-[var(--color-brand)]/5 p-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{line.label}</p>
            <p className="text-xs text-slate-500">{LABEL_SERVICE}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-sm font-medium text-slate-800">{PESO.format(line.amount + line.fee)}</span>
            <button
              type="button"
              aria-label={`${ARIA_REMOVE_PREFIX} ${line.label}`}
              onClick={() => onRemoveService(line.id)}
              className="flex h-11 min-w-11 cursor-pointer items-center justify-center px-2 text-xs text-red-600 hover:underline"
            >
              {BUTTON_REMOVE}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
