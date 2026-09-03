/** Shared money formatting/rounding so every screen agrees on both. */
export const PESO = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/**
 * Whole pesos, no centavos -- for prices that are quoted rather than
 * transacted: plan tiers and the pricing page. Deliberately a second
 * formatter rather than a parameter on the first, because the choice between
 * them is about what is being shown, not about how it is rounded. A till
 * total must show centavos; "₱499/month" must not show "₱499.00/month".
 */
export const PESO_WHOLE = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
});

/** Rounds to the nearest centavo (2 decimal places). */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
