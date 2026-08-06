import { PESO, HEADING_DEBT_AGING, LABEL_AGING_0_14, LABEL_AGING_15_30, LABEL_AGING_OVER_30, TEXT_AGING_SUMMARY_SUFFIX } from "@/lib";
import type { DebtAgingSummary } from "../../lib";

interface DebtAgeCardProps {
  aging: DebtAgingSummary;
}

const BUCKETS: { key: keyof Pick<DebtAgingSummary, "bucket0to14" | "bucket15to30" | "bucketOver30">; label: string; color: string; bad?: boolean }[] = [
  { key: "bucket0to14", label: LABEL_AGING_0_14, color: "#3B82F6" },
  { key: "bucket15to30", label: LABEL_AGING_15_30, color: "#60A5FA" },
  { key: "bucketOver30", label: LABEL_AGING_OVER_30, color: "#F87171", bad: true },
];

export function DebtAgeCard({ aging }: DebtAgeCardProps) {
  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {HEADING_DEBT_AGING}
      </p>

      <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
        {BUCKETS.map(({ key, color }) => (
          <span
            key={key}
            style={{ width: aging.total > 0 ? `${(aging[key] / aging.total) * 100}%` : 0, background: color }}
          />
        ))}
      </div>

      {BUCKETS.map(({ key, label, color, bad }) => (
        <div key={key} className="tpl-sp" style={{ padding: "4px 0" }}>
          <span className={bad ? "tpl-bad" : "tpl-dim"} style={{ fontSize: 13 }}>
            <span
              style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block", marginRight: 8 }}
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
