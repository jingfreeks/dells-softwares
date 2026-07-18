/** Shared money formatting/rounding so every screen agrees on both. */
export const PESO = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** Rounds to the nearest centavo (2 decimal places). */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
