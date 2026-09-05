import {
  LABEL_PERIOD_TODAY,
  LABEL_PERIOD_WEEK,
  LABEL_PERIOD_MONTH,
  LABEL_PERIOD_LAST_MONTH,
  LABEL_PERIOD_CUSTOM,
  LABEL_REVIEW_FROM,
  LABEL_REVIEW_TO,
  ARIA_REVIEW_PERIOD,
} from "@/lib";
import type { ReviewPeriodPreset, ReviewPeriod } from "../../lib";

interface ReviewPeriodFilterProps {
  preset: ReviewPeriodPreset;
  onPresetChange: (preset: ReviewPeriodPreset) => void;
  custom: ReviewPeriod;
  onCustomChange: (custom: ReviewPeriod) => void;
}

const PRESETS: { value: ReviewPeriodPreset; label: string }[] = [
  { value: "today", label: LABEL_PERIOD_TODAY },
  { value: "week", label: LABEL_PERIOD_WEEK },
  { value: "month", label: LABEL_PERIOD_MONTH },
  { value: "lastMonth", label: LABEL_PERIOD_LAST_MONTH },
  { value: "custom", label: LABEL_PERIOD_CUSTOM },
];

/**
 * The same chip row Reports uses, with Review's preset set.
 *
 * Chips rather than a select: they are the app's established pattern for this,
 * and the current period stays readable without opening anything — which is
 * the point of a dashboard you are meant to take in at a glance.
 */
export function ReviewPeriodFilter({
  preset,
  onPresetChange,
  custom,
  onCustomChange,
}: ReviewPeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={ARIA_REVIEW_PERIOD}>
      {PRESETS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === preset ? "tpl-chip tpl-on" : "tpl-chip"}
          aria-pressed={option.value === preset}
          onClick={() => onPresetChange(option.value)}
        >
          {option.label}
        </button>
      ))}

      {preset === "custom" && (
        <span className="flex flex-wrap items-center gap-2">
          <label className="tpl-lbl" htmlFor="reviewFrom" style={{ margin: 0 }}>
            {LABEL_REVIEW_FROM}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 0 }}>
            <input
              id="reviewFrom"
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(e) => onCustomChange({ ...custom, from: e.target.value })}
            />
          </div>
          <label className="tpl-lbl" htmlFor="reviewTo" style={{ margin: 0 }}>
            {LABEL_REVIEW_TO}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 0 }}>
            <input
              id="reviewTo"
              type="date"
              value={custom.to}
              min={custom.from}
              onChange={(e) => onCustomChange({ ...custom, to: e.target.value })}
            />
          </div>
        </span>
      )}
    </div>
  );
}
