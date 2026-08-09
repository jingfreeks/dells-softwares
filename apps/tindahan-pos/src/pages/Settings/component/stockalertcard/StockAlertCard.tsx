import {
  LABEL_ALERTS_STOCK,
  LABEL_WARN_BELOW,
  TEXT_DAYS_OF_COVER_SUFFIX,
  TEXT_DAY_SUFFIX,
  TEXT_DAYS_SUFFIX,
  LABEL_FAST_MOVERS_WARN_EARLIER,
  LABEL_OUT_OF_STOCK_STRAIGHT_AWAY,
} from "@/lib";

interface StockAlertCardProps {
  thresholdDays: number;
  onThresholdDaysChange: (value: number) => void;
  minThresholdDays: number;
  maxThresholdDays: number;
  fastMoverBoost: boolean;
  onToggleFastMoverBoost: () => void;
  warnOutOfStockImmediately: boolean;
  onToggleWarnOutOfStockImmediately: () => void;
}

export function StockAlertCard({
  thresholdDays,
  onThresholdDaysChange,
  minThresholdDays,
  maxThresholdDays,
  fastMoverBoost,
  onToggleFastMoverBoost,
  warnOutOfStockImmediately,
  onToggleWarnOutOfStockImmediately,
}: StockAlertCardProps) {
  const sliderPercent = ((thresholdDays - minThresholdDays) / (maxThresholdDays - minThresholdDays)) * 100;

  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_ALERTS_STOCK}
      </p>

      <div className="tpl-sp" style={{ marginBottom: 8 }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_WARN_BELOW}</span>
        <span style={{ color: "var(--tpl-a4)", fontSize: 15, fontWeight: 500 }}>
          {thresholdDays} {thresholdDays === 1 ? TEXT_DAY_SUFFIX : TEXT_DAYS_SUFFIX} {TEXT_DAYS_OF_COVER_SUFFIX}
        </span>
      </div>
      <input
        type="range"
        className="tpl-range"
        min={minThresholdDays}
        max={maxThresholdDays}
        step={1}
        value={thresholdDays}
        onChange={(e) => onThresholdDaysChange(Number(e.target.value))}
        aria-label={LABEL_WARN_BELOW}
        style={{ ["--tpl-range-fill" as string]: `${sliderPercent}%`, marginBottom: 14 }}
      />

      <div className="tpl-sp" style={{ padding: "4px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_FAST_MOVERS_WARN_EARLIER}</span>
        <button
          type="button"
          role="switch"
          aria-checked={fastMoverBoost}
          aria-label={LABEL_FAST_MOVERS_WARN_EARLIER}
          onClick={onToggleFastMoverBoost}
          className={`tpl-tog${fastMoverBoost ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>
      <div className="tpl-sp" style={{ padding: "4px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_OUT_OF_STOCK_STRAIGHT_AWAY}</span>
        <button
          type="button"
          role="switch"
          aria-checked={warnOutOfStockImmediately}
          aria-label={LABEL_OUT_OF_STOCK_STRAIGHT_AWAY}
          onClick={onToggleWarnOutOfStockImmediately}
          className={`tpl-tog${warnOutOfStockImmediately ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>
    </div>
  );
}
