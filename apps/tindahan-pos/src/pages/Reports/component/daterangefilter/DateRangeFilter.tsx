import {
  LABEL_PERIOD_TODAY,
  LABEL_PERIOD_WEEK,
  LABEL_PERIOD_MONTH,
  LABEL_PERIOD_CUSTOM,
} from "@/lib";
import type { DateRangePreset } from "../../lib";

interface DateRangeFilterProps {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  customStart: string;
  onCustomStartChange: (value: string) => void;
  customEnd: string;
  onCustomEndChange: (value: string) => void;
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: LABEL_PERIOD_TODAY },
  { value: "week", label: LABEL_PERIOD_WEEK },
  { value: "month", label: LABEL_PERIOD_MONTH },
  { value: "custom", label: LABEL_PERIOD_CUSTOM },
];

export function DateRangeFilter({
  preset,
  onPresetChange,
  customStart,
  onCustomStartChange,
  customEnd,
  onCustomEndChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          className={p.value === preset ? "tpl-chip tpl-on" : "tpl-chip"}
          aria-pressed={p.value === preset}
          onClick={() => onPresetChange(p.value)}
        >
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <span className="flex items-center gap-2">
          <div className="tpl-fld" style={{ padding: "0 10px" }}>
            <input
              type="date"
              aria-label="Start date"
              value={customStart}
              onChange={(e) => onCustomStartChange(e.target.value)}
            />
          </div>
          <span className="tpl-ts">–</span>
          <div className="tpl-fld" style={{ padding: "0 10px" }}>
            <input
              type="date"
              aria-label="End date"
              value={customEnd}
              onChange={(e) => onCustomEndChange(e.target.value)}
            />
          </div>
        </span>
      )}
    </div>
  );
}
