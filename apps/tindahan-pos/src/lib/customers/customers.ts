import type { Customer, SaleRecord } from "@/lib/types";

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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days since the oldest credit (utang) sale the customer's current balance
 * can still be traced to.
 *
 * The backend has no ledger linking a payment to the sale it settles --
 * only a running balance -- so which specific debts are outstanding has to
 * be inferred. Credit sales are walked newest-first, accumulating totals
 * until they cover the balance; the last one reached is the oldest debt
 * still owed. That is the FIFO assumption, and it is the right one for
 * utang: a payment settles what was borrowed first.
 *
 * This previously returned the age of the customer's *earliest ever*
 * credit sale, whether or not it had long since been repaid. A reliable
 * customer who first bought on credit two years ago and owes for
 * yesterday's purchase was reported as two years overdue, and
 * isOverdueDebt() flagged them -- which drives the overdue filter and the
 * aging summary, so it affected who a storekeeper chases for money.
 *
 * Still an approximation: without a real ledger, a partially-paid sale
 * cannot be distinguished from a fully-paid one. It is bounded by the
 * balance now, rather than unbounded by history.
 *
 * Returns null when the customer owes nothing or has no credit sales.
 */
export function computeOldestDebtDays(
  sales: SaleRecord[],
  customer: Customer,
  now: Date = new Date()
): number | null {
  if (customer.balance <= 0) return null;

  const creditSales = sales
    .filter(
      (sale) => sale.status !== "voided" && sale.paymentType === "credit" && sale.customerId === customer.id
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (creditSales.length === 0) return null;

  // Newest first, until the accumulated total covers what is still owed.
  let covered = 0;
  let oldestOwed = creditSales[0];
  for (const sale of creditSales) {
    oldestOwed = sale;
    covered += sale.total;
    if (covered >= customer.balance) break;
  }

  // If the credit sales on record cannot account for the balance -- an
  // opening balance, or history older than what was loaded -- the oldest
  // sale is the best available answer rather than a wrong precise one.
  return Math.floor((now.getTime() - new Date(oldestOwed.timestamp).getTime()) / MS_PER_DAY);
}

export interface LatestTransaction {
  date: string;
  amount: number;
}

/** This customer's most recent sale (any payment type), or null if they have none. */
export function latestTransactionForCustomer(sales: SaleRecord[], customerId: string): LatestTransaction | null {
  const customerSales = sales.filter((sale) => sale.status !== "voided" && sale.customerId === customerId);
  if (customerSales.length === 0) return null;
  const latest = customerSales.reduce((mostRecent, sale) =>
    new Date(sale.timestamp) > new Date(mostRecent.timestamp) ? sale : mostRecent
  );
  return { date: latest.timestamp, amount: latest.total };
}

/** Debt older than `thresholdDays` (from Settings → Alerts, default 30) counts as "overdue". */
export function isOverdueDebt(oldestDebtDays: number | null, thresholdDays = 30): boolean {
  return oldestDebtDays !== null && oldestDebtDays > thresholdDays;
}

export type CreditUsageVariant = "default" | "warn" | "danger";

/** Over the limit reads as danger; overdue-but-within-limit reads as a warning. */
export function creditUsageVariant(
  customer: Customer,
  oldestDebtDays: number | null,
  thresholdDays = 30
): CreditUsageVariant {
  if (customer.creditLimit !== null && customer.balance > customer.creditLimit) return "danger";
  if (isOverdueDebt(oldestDebtDays, thresholdDays)) return "warn";
  return "default";
}

export interface DebtAgingSummary {
  bucket0to14: number;
  bucket15to30: number;
  bucketOver30: number;
  total: number;
  /** Percent of total utang in the "over threshold" bucket, rounded to the nearest whole number. */
  overThirtyPercent: number;
}

/**
 * Buckets every customer's current balance by their oldest-debt age, using
 * `thresholdDays` (from Settings → Alerts, default 30) as the "overdue" cut
 * and its midpoint as the boundary between the first two buckets. The
 * `bucket0to14`/`bucket15to30` field names are historical (from the
 * original hardcoded 14/30-day version) but now hold whatever range the
 * threshold produces.
 */
export function buildDebtAgingSummary(
  customers: Customer[],
  oldestDebtDaysById: Map<string, number | null>,
  thresholdDays = 30
): DebtAgingSummary {
  const midpoint = Math.max(1, Math.floor(thresholdDays / 2));
  let bucket0to14 = 0;
  let bucket15to30 = 0;
  let bucketOver30 = 0;

  for (const customer of customers) {
    if (customer.balance <= 0) continue;
    const days = oldestDebtDaysById.get(customer.id) ?? null;
    if (days === null || days <= midpoint) {
      bucket0to14 += customer.balance;
    } else if (days <= thresholdDays) {
      bucket15to30 += customer.balance;
    } else {
      bucketOver30 += customer.balance;
    }
  }

  const total = bucket0to14 + bucket15to30 + bucketOver30;
  const overThirtyPercent = total > 0 ? Math.round((bucketOver30 / total) * 100) : 0;

  return { bucket0to14, bucket15to30, bucketOver30, total, overThirtyPercent };
}
