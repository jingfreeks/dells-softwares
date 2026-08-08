import type { Customer } from "@/lib/types";

/**
 * Whether charging `saleTotal` to this customer would push their balance
 * past their credit limit. This is now server-enforced by checkout_sale()
 * (see 0022_owner_pin_override.sql) — callers use this for instant
 * client-side UX (showing the warning and opening the owner-approval flow
 * before even attempting checkout), but the real authorization decision is
 * made server-side against the customer's authoritative, row-locked
 * balance. A customer with no limit set never triggers this.
 */
export function wouldExceedCreditLimit(customer: Customer, saleTotal: number): boolean {
  if (customer.creditLimit === null) return false;
  return customer.balance + saleTotal > customer.creditLimit;
}

/** How far over the limit (in pesos) this sale would push the customer — 0 if it wouldn't. */
export function creditOverageAmount(customer: Customer, saleTotal: number): number {
  if (customer.creditLimit === null) return 0;
  const projected = customer.balance + saleTotal;
  return Math.max(0, projected - customer.creditLimit);
}
