import { amount } from "@/lib";

export type BucketTone = "ok" | "info" | "warn" | "bad" | "mut";

export interface AgingBucket {
  key: string;
  label: string;
  amount: number;
  tone: BucketTone;
  /** Counted towards the overdue total. Not every bucket is, and not every
   *  non-overdue bucket is current -- see `unaged` on receivables. */
  overdue: boolean;
}

const TONE: Record<BucketTone, string> = {
  ok: "var(--ok)",
  info: "var(--info)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  mut: "var(--mut)",
};

/**
 * A bucket's share of the total.
 *
 * Zero when the total is zero rather than NaN: 0/0 renders as "NaN%" and, as a
 * CSS width, silently becomes the full bar -- an empty book showing a full
 * meter.
 */
export function shareOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

/**
 * The stacked aging bar and the tiles beneath it, shared by receivables and
 * payables. The two age differently -- one from a charge date, the other from
 * a due date -- but they display identically, and two copies of this would
 * drift.
 *
 * The bar is decorative: every figure it encodes is also printed as a number,
 * a label and a percentage below, because a proportion drawn in colour is
 * unreadable in print, at a glance, and to a colour-blind reader (§47). Hence
 * aria-hidden rather than ARIA describing what the tiles already say.
 */
export function AgingMeter({ buckets, total }: { buckets: AgingBucket[]; total: number }) {
  const shown = buckets.filter((b) => b.amount > 0);

  return (
    <div>
      {shown.length > 0 ? (
        <div className="meter" aria-hidden style={{ display: "flex" }}>
          {shown.map((b) => (
            <span key={b.key} style={{ width: `${shareOf(b.amount, total)}%`, background: TONE[b.tone] }} />
          ))}
        </div>
      ) : null}

      <div className="row g12" style={{ marginTop: 12, flexWrap: "wrap" }}>
        {buckets.map((b) => (
          <div key={b.key} className="kpi q" style={{ minWidth: 150 }}>
            <div className="t-over">{b.label}</div>
            <div className="amt amt-lg">{amount(b.amount)}</div>
            <div className="t-cap">
              {total > 0 ? `${shareOf(b.amount, total).toFixed(1)}% of the book` : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sums the buckets flagged overdue. Rounded once, in centavos. */
export function overdueTotal(buckets: AgingBucket[]): number {
  return Math.round(buckets.filter((b) => b.overdue).reduce((s, b) => s + b.amount, 0) * 100) / 100;
}
