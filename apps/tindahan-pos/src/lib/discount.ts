export interface Discount {
  type: "percentage" | "flat";
  value: number;
}

/** Mirrors checkout_sale()'s own discount computation exactly, so the
 * optimistic pre-RPC total matches what the server will actually charge. */
export function computeDiscountAmount(subtotal: number, discount: Discount | null | undefined): number {
  if (!discount) return 0;
  if (discount.type === "percentage") {
    return Math.round(subtotal * discount.value / 100 * 100) / 100;
  }
  return Math.min(discount.value, subtotal);
}
