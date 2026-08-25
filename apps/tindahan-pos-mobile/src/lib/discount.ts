export interface Discount {
  type: "percentage" | "flat";
  value: number;
}

/**
 * Mirrors checkout_sale()'s own discount computation exactly (see
 * 20260815132000_generic_discount.sql in the web app's migrations), so
 * the optimistic pre-RPC total shown on screen matches what the server
 * will actually charge. Ported from apps/tindahan-pos/src/lib/discount.ts.
 */
export function computeDiscountAmount(subtotal: number, discount: Discount | null | undefined): number {
  if (!discount) return 0;
  if (discount.type === "percentage") {
    return Math.round(((subtotal * discount.value) / 100) * 100) / 100;
  }
  return Math.min(discount.value, subtotal);
}
