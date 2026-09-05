import type { AgingBucket } from "@/components";
import type { Receivable } from "@/lib";

/**
 * The five buckets the accounting design specifies, plus a sixth the data
 * forces: `unaged`.
 *
 * The POS records a running utang balance and payments that name no sale, so
 * a balance can exist that no charge accounts for -- an opening balance from a
 * shop migrating onto the POS, or a manual correction. my_receivables()
 * returns that separately rather than folding it into a bucket, and the screen
 * shows it separately for the same reason: it is money owed whose age nobody
 * knows, and pretending it is Current would be a guess in the shop's favour.
 */
export function bucketsFor(r: Receivable): AgingBucket[] {
  return [
    { key: "current", label: "Current", amount: r.current, tone: "ok", overdue: false },
    { key: "d1_30", label: "1–30 days", amount: r.d1_30, tone: "info", overdue: true },
    { key: "d31_60", label: "31–60 days", amount: r.d31_60, tone: "warn", overdue: true },
    { key: "d61_90", label: "61–90 days", amount: r.d61_90, tone: "bad", overdue: true },
    { key: "d90Plus", label: "Over 90 days", amount: r.d90Plus, tone: "bad", overdue: true },
    { key: "unaged", label: "Age unknown", amount: r.unaged, tone: "mut", overdue: false },
  ];
}

export interface ReceivablesTotals {
  outstanding: number;
  current: number;
  overdue: number;
  unaged: number;
  buckets: AgingBucket[];
  customers: number;
}

/** Sums the whole book. Rounded once, at the end, in centavos. */
export function totalsFor(rows: Receivable[]): ReceivablesTotals {
  const sum = (pick: (r: Receivable) => number) =>
    round2(rows.reduce((acc, r) => acc + pick(r), 0));

  const current = sum((r) => r.current);
  const unaged = sum((r) => r.unaged);
  const overdue = round2(
    sum((r) => r.d1_30) + sum((r) => r.d31_60) + sum((r) => r.d61_90) + sum((r) => r.d90Plus)
  );

  return {
    outstanding: sum((r) => r.outstanding),
    current,
    overdue,
    unaged,
    customers: rows.length,
    buckets: [
      { key: "current", label: "Current", amount: current, tone: "ok", overdue: false },
      { key: "d1_30", label: "1–30 days", amount: sum((r) => r.d1_30), tone: "info", overdue: true },
      { key: "d31_60", label: "31–60 days", amount: sum((r) => r.d31_60), tone: "warn", overdue: true },
      { key: "d61_90", label: "61–90 days", amount: sum((r) => r.d61_90), tone: "bad", overdue: true },
      { key: "d90Plus", label: "Over 90 days", amount: sum((r) => r.d90Plus), tone: "bad", overdue: true },
      { key: "unaged", label: "Age unknown", amount: unaged, tone: "mut", overdue: false },
    ],
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}


/** Days since the oldest unpaid charge, or null when nothing is aged. */
export function daysOverdue(oldestUnpaid: string | null, today: Date = new Date()): number | null {
  if (!oldestUnpaid) return null;
  const [y, m, d] = oldestUnpaid.split("-").map(Number);
  const then = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((now - then) / 86_400_000));
}
