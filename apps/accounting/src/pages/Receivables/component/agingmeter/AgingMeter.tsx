import { amount } from "@/lib";
import { shareOf, type AgingBucket } from "../../lib";

const TONE: Record<AgingBucket["key"], string> = {
  current: "var(--ok)",
  d1_30: "var(--info)",
  d31_60: "var(--warn)",
  d61_90: "var(--bad)",
  d90Plus: "var(--bad)",
  unaged: "var(--mut)",
};

/**
 * The stacked aging bar, and the tiles beneath it.
 *
 * The bar is decorative: every figure it encodes is also printed as a number
 * and a label below, because a proportion drawn in colour is unreadable in
 * print, at a glance, and to a colour-blind reader (§47). Hence aria-hidden on
 * the bar rather than a pile of ARIA on something the table already says.
 */
export function AgingMeter({ buckets, total }: { buckets: AgingBucket[]; total: number }) {
  const shown = buckets.filter((b) => b.amount > 0);

  return (
    <div>
      {shown.length > 0 ? (
        <div className="meter" aria-hidden style={{ display: "flex" }}>
          {shown.map((b) => (
            <span
              key={b.key}
              style={{ width: `${shareOf(b.amount, total)}%`, background: TONE[b.key] }}
            />
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
