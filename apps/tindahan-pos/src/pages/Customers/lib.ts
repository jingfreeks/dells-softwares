import type { Customer, SaleRecord } from "@/lib";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days since this customer's earliest recorded "credit" (utang) sale —
 * a stand-in for "how old is the oldest unpaid debt". The backend has
 * no ledger linking a payment to the specific sale it settles (only a
 * running balance), so this is an approximation from real sales data
 * rather than an exact unpaid-since date.
 * TODO: replace with a precise value once the backend tracks which
 * credit sale(s) a customer's current balance traces back to.
 * Returns null when the customer has no balance or no credit sales.
 */
export function computeOldestDebtDays(
  sales: SaleRecord[],
  customer: Customer,
  now: Date = new Date()
): number | null {
  if (customer.balance <= 0) return null;
  const creditSaleTimestamps = sales
    .filter((sale) => sale.paymentType === "credit" && sale.customerId === customer.id)
    .map((sale) => new Date(sale.timestamp).getTime());
  if (creditSaleTimestamps.length === 0) return null;
  const oldest = Math.min(...creditSaleTimestamps);
  return Math.floor((now.getTime() - oldest) / MS_PER_DAY);
}

/** Debt older than a month is the "overdue" threshold used across the page. */
export function isOverdueDebt(oldestDebtDays: number | null): boolean {
  return oldestDebtDays !== null && oldestDebtDays > 30;
}

export type CreditUsageVariant = "default" | "warn" | "danger";

/** Over the limit reads as danger; overdue-but-within-limit reads as a warning. */
export function creditUsageVariant(
  customer: Customer,
  oldestDebtDays: number | null
): CreditUsageVariant {
  if (customer.creditLimit !== null && customer.balance > customer.creditLimit) return "danger";
  if (isOverdueDebt(oldestDebtDays)) return "warn";
  return "default";
}

export interface DebtAgingSummary {
  bucket0to14: number;
  bucket15to30: number;
  bucketOver30: number;
  total: number;
  /** Percent of total utang in the "over 30 days" bucket, rounded to the nearest whole number. */
  overThirtyPercent: number;
}

/** Buckets every customer's current balance by their oldest-debt age. */
export function buildDebtAgingSummary(
  customers: Customer[],
  oldestDebtDaysById: Map<string, number | null>
): DebtAgingSummary {
  let bucket0to14 = 0;
  let bucket15to30 = 0;
  let bucketOver30 = 0;

  for (const customer of customers) {
    if (customer.balance <= 0) continue;
    const days = oldestDebtDaysById.get(customer.id) ?? null;
    if (days === null || days <= 14) {
      bucket0to14 += customer.balance;
    } else if (days <= 30) {
      bucket15to30 += customer.balance;
    } else {
      bucketOver30 += customer.balance;
    }
  }

  const total = bucket0to14 + bucket15to30 + bucketOver30;
  const overThirtyPercent = total > 0 ? Math.round((bucketOver30 / total) * 100) : 0;

  return { bucket0to14, bucket15to30, bucketOver30, total, overThirtyPercent };
}

/** Two-letter initials for the row avatar, e.g. "Aling Rosa" -> "AR". */
export function customerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Finds an existing customer that's likely the same person as `name` —
 * an exact match, or a shared first name (e.g. "Rosa Mendoza" vs.
 * "Rosa M."). A heuristic for the add-customer duplicate warning, not
 * a strict identity check.
 */
export function findDuplicateCustomer(customers: Customer[], name: string): Customer | null {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return null;
  const firstWord = trimmed.split(/\s+/)[0];

  return (
    customers.find((customer) => {
      const existing = customer.name.trim().toLowerCase();
      if (existing === trimmed) return true;
      const existingFirstWord = existing.split(/\s+/)[0];
      return firstWord.length > 1 && existingFirstWord === firstWord;
    }) ?? null
  );
}
