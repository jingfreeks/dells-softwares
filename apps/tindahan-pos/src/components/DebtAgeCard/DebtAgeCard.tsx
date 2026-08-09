import { PESO, HEADING_DEBT_AGING, TEXT_DAYS_SUFFIX, TEXT_AGING_SUMMARY_SUFFIX } from "@/lib";
import type { DebtAgingSummary } from "@/lib/customers";

interface DebtAgeCardProps {
  aging: DebtAgingSummary;
  /** Overdue cutoff in days (Settings → Alerts "Utang aging threshold") — drives the bucket labels below. */
  thresholdDays: number;
}

const BUCKET_COLORS: Record<keyof Pick<DebtAgingSummary, "bucket0to14" | "bucket15to30" | "bucketOver30">, string> = {
  bucket0to14: "#3B82F6",
  bucket15to30: "#60A5FA",
  bucketOver30: "#F87171",
};

export function DebtAgeCard({ aging, thresholdDays }: DebtAgeCardProps) {
  const midpoint = Math.max(1, Math.floor(thresholdDays / 2));
  const buckets: {
    key: keyof Pick<DebtAgingSummary, "bucket0to14" | "bucket15to30" | "bucketOver30">;
    label: string;
    bad?: boolean;
  }[] = [
    { key: "bucket0to14", label: `0–${midpoint} ${TEXT_DAYS_SUFFIX}` },
    { key: "bucket15to30", label: `${midpoint + 1}–${thresholdDays} ${TEXT_DAYS_SUFFIX}` },
    { key: "bucketOver30", label: `Over ${thresholdDays} ${TEXT_DAYS_SUFFIX}`, bad: true },
  ];

  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {HEADING_DEBT_AGING}
      </p>

      <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
        {buckets.map(({ key }) => (
          <span
            key={key}
            style={{
              width: aging.total > 0 ? `${(aging[key] / aging.total) * 100}%` : 0,
              background: BUCKET_COLORS[key],
            }}
          />
        ))}
      </div>

      {buckets.map(({ key, label, bad }) => (
        <div key={key} className="tpl-sp" style={{ padding: "4px 0" }}>
          <span className={bad ? "tpl-bad" : "tpl-dim"} style={{ fontSize: 13 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: BUCKET_COLORS[key],
                display: "inline-block",
                marginRight: 8,
              }}
            />
            {label}
          </span>
          <span className={bad ? "tpl-bad" : undefined} style={{ fontSize: 13, color: bad ? undefined : "var(--tpl-t2)" }}>
            {PESO.format(aging[key])}
          </span>
        </div>
      ))}

      <p className="tpl-hint" style={{ borderTop: "0.5px solid var(--tpl-bd3)", paddingTop: 10, marginTop: 10 }}>
        {aging.overThirtyPercent}% {TEXT_AGING_SUMMARY_SUFFIX}
      </p>
    </div>
  );
}
