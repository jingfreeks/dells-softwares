import type { Customer } from "./types";

/**
 * Whether charging `saleTotal` to this customer would push their balance
 * past their credit limit. Advisory only (per product decision — credit
 * limits are never enforced at checkout) — callers use this to show a
 * warning, not to block the sale. A customer with no limit set never
 * triggers this.
 */
export function wouldExceedCreditLimit(customer: Customer, saleTotal: number): boolean {
  if (customer.creditLimit === null) return false;
  return customer.balance + saleTotal > customer.creditLimit;
}
