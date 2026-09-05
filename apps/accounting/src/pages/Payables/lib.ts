import type { AgingBucket } from "@/components";
import type { Payable } from "@/lib";

/**
 * The payables buckets.
 *
 * The first one is "Not yet due", not "Current" -- a payable inside its terms
 * is not merely recent, it is money the supplier has agreed to wait for, and
 * calling it Current invites an owner to pay it early for no reason.
 *
 * There is no sixth bucket here. Receivables needs one because the POS cannot
 * say which charge a payment settled; a delivery always carries its own date
 * and its supplier's terms, so every peso can be aged.
 */
export function bucketsFor(p: Payable): AgingBucket[] {
  return [
    { key: "notYetDue", label: "Not yet due", amount: p.notYetDue, tone: "ok", overdue: false },
    { key: "d1_30", label: "1–30 days", amount: p.d1_30, tone: "info", overdue: true },
    { key: "d31_60", label: "31–60 days", amount: p.d31_60, tone: "warn", overdue: true },
    { key: "d61_90", label: "61–90 days", amount: p.d61_90, tone: "bad", overdue: true },
    { key: "d90Plus", label: "Over 90 days", amount: p.d90Plus, tone: "bad", overdue: true },
  ];
}

export interface PayablesTotals {
  outstanding: number;
  notYetDue: number;
  overdue: number;
  suppliers: number;
  deliveries: number;
  buckets: AgingBucket[];
}

export function totalsFor(rows: Payable[]): PayablesTotals {
  const sum = (pick: (p: Payable) => number) =>
    round2(rows.reduce((acc, p) => acc + pick(p), 0));

  const buckets: AgingBucket[] = [
    { key: "notYetDue", label: "Not yet due", amount: sum((p) => p.notYetDue), tone: "ok", overdue: false },
    { key: "d1_30", label: "1–30 days", amount: sum((p) => p.d1_30), tone: "info", overdue: true },
    { key: "d31_60", label: "31–60 days", amount: sum((p) => p.d31_60), tone: "warn", overdue: true },
    { key: "d61_90", label: "61–90 days", amount: sum((p) => p.d61_90), tone: "bad", overdue: true },
    { key: "d90Plus", label: "Over 90 days", amount: sum((p) => p.d90Plus), tone: "bad", overdue: true },
  ];

  return {
    outstanding: sum((p) => p.outstanding),
    notYetDue: sum((p) => p.notYetDue),
    overdue: round2(buckets.filter((b) => b.overdue).reduce((s, b) => s + b.amount, 0)),
    suppliers: rows.length,
    deliveries: rows.reduce((s, p) => s + p.deliveries, 0),
    buckets,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Days past the due date, or null when nothing is overdue. */
export function daysLate(oldestDue: string | null, today: Date = new Date()): number | null {
  if (!oldestDue) return null;
  const [y, m, d] = oldestDue.split("-").map(Number);
  const then = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((now - then) / 86_400_000));
}
