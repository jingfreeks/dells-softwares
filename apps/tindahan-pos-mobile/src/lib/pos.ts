import { roundMoney } from "./money";
import type { CartLine, Product } from "./types";

// Caps at the product's available stock (negative stock reads as zero) so a
// barcode scan or search-submit cannot silently build a cart the sale will be
// rejected for at checkout -- the cashier finds out immediately instead. The
// web app has capped here since it was written; mobile did not, so the same
// scan produced a sellable cart on one client and a refusal on the other.
export function addToCart(cart: CartLine[], product: Product, quantity = 1): CartLine[] {
  const available = Math.max(0, product.stock);
  const existing = cart.find((line) => line.product.id === product.id);
  if (existing) {
    const nextQuantity = Math.min(existing.quantity + quantity, available);
    if (nextQuantity <= existing.quantity) return cart;
    return cart.map((line) =>
      line.product.id === product.id ? { ...line, quantity: nextQuantity } : line
    );
  }
  const cappedQuantity = Math.min(quantity, available);
  if (cappedQuantity <= 0) return cart;
  return [...cart, { product, quantity: cappedQuantity }];
}

export function removeFromCart(cart: CartLine[], productId: string): CartLine[] {
  return cart.filter((line) => line.product.id !== productId);
}

export function setQuantity(cart: CartLine[], productId: string, quantity: number): CartLine[] {
  if (quantity <= 0) return removeFromCart(cart, productId);
  const line = cart.find((l) => l.product.id === productId);
  if (!line) return cart;
  const cappedQuantity = Math.min(quantity, Math.max(0, line.product.stock));
  if (cappedQuantity <= 0) return removeFromCart(cart, productId);
  return cart.map((l) => (l.product.id === productId ? { ...l, quantity: cappedQuantity } : l));
}

/**
 * Amount charged for a cart line. Pack-priced products (e.g. "3 pcs for
 * ₱5") are computed from the pack fraction directly and rounded once, so
 * a full pack always totals to an exact amount instead of drifting by a
 * centavo from qty * rounded-per-unit-price. Mirrors checkout_sale()'s
 * server-side math so the cart preview always matches what gets charged.
 *
 * `packPricingEnabled` mirrors the `pack_pricing` feature flag that
 * checkout_sale() itself checks (migration 0008) — pass the flag's
 * current value through so a disabled flag falls back to regular price
 * here too, instead of the preview showing pack pricing while the RPC
 * charges regular price.
 */
export function lineTotal(product: Product, quantity: number, packPricingEnabled = true): number {
  if (packPricingEnabled && product.packQuantity != null && product.packPrice != null) {
    return roundMoney((quantity * product.packPrice) / product.packQuantity);
  }
  return roundMoney(product.price * quantity);
}

export function cartTotal(cart: CartLine[], packPricingEnabled = true): number {
  return cart.reduce((sum, line) => sum + lineTotal(line.product, line.quantity, packPricingEnabled), 0);
}

export function cartItemCount(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Change due for a cash payment. Returns null if the amount tendered is
 * insufficient to cover the total (story A5).
 */
export function computeChange(total: number, amountTendered: number): number | null {
  if (amountTendered < total) return null;
  return roundMoney(amountTendered - total);
}

export function findProductByBarcode(products: Product[], barcode: string): Product | undefined {
  return products.find((p) => p.barcode === barcode);
}

export function searchProductsByName(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter((p) => p.name.toLowerCase().includes(q));
}

/**
 * One-tap cash-tendered suggestions for the checkout sheet: the exact
 * total plus the next ₱100/₱200/₱500/₱1,000 round figure above it, so a
 * cashier can usually tap instead of typing. Deduped (a total that's
 * already a round figure, e.g. ₱100, doesn't get itself listed twice) and
 * capped at 4 to match the mockup's single row.
 */
export function quickCashAmounts(total: number): number[] {
  if (total <= 0) return [];
  const roundUps = [100, 200, 500, 1000].map((denom) => Math.ceil(total / denom) * denom);
  return Array.from(new Set([total, ...roundUps])).slice(0, 4);
}
