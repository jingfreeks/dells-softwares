import {
  LABEL_WHEN_SHOULD_WE_WARN_YOU,
  TEXT_STOCK_ALERTS_STEP_DESCRIPTION,
  LABEL_BY_DAYS_OF_COVER,
  LABEL_BETTER_BADGE,
  TEXT_BY_DAYS_OF_COVER_DESC,
  LABEL_BY_FIXED_QUANTITY,
  TEXT_BY_FIXED_QUANTITY_DESC,
  LABEL_WARN_ME_WHEN_LESS_THAN,
  TEXT_DAYS_SUFFIX,
  TEXT_DAY_SUFFIX,
  TEXT_OF_STOCK_LEFT_SUFFIX,
  TEXT_ONE_DAY_RISKY,
  TEXT_SEVEN_DAYS_LOTS_OF_CAPITAL,
  TEXT_TODAY_YOU_WOULD_BE_WARNED_ABOUT_PREFIX,
  TEXT_ITEMS_SUFFIX,
  TEXT_SLIDE_LEFT_HINT,
  TEXT_OUT_NOW,
  TEXT_HRS_SUFFIX,
  LABEL_FAST_MOVERS_TITLE,
  TEXT_FAST_MOVERS_DESC,
  LABEL_DAILY_SUMMARY_TITLE,
  TEXT_DAILY_SUMMARY_DESC,
  BUTTON_CONTINUE,
  BUTTON_USE_THE_DEFAULT,
  TEXT_SAVED_AUTOMATICALLY,
} from "@/lib";
import { useStockAlertsStep } from "../useStockAlertsStep";
import { formatDaysOfStockLeft } from "../lib";

function formatPreviewLabel(daysOfStockLeft: number): string {
  const label = formatDaysOfStockLeft(daysOfStockLeft);
  if (label.kind === "out") return TEXT_OUT_NOW;
  if (label.kind === "hours") return `${label.hours} ${TEXT_HRS_SUFFIX}`;
  return `${label.days} ${label.days === 1 ? TEXT_DAY_SUFFIX : TEXT_DAYS_SUFFIX}`;
}

interface StockAlertsStepProps {
  onContinue: () => void;
  onUseDefault: () => void;
}

export function StockAlertsStep({ onContinue, onUseDefault }: StockAlertsStepProps) {
  const {
    strategy,
    setStrategy,
    thresholdDays,
    setThresholdDays,
    minThresholdDays,
    maxThresholdDays,
    fastMoverBoost,
    setFastMoverBoost,
    dailySummary,
    setDailySummary,
    preview,
  } = useStockAlertsStep();

  const sliderPercent = ((thresholdDays - minThresholdDays) / (maxThresholdDays - minThresholdDays)) * 100;
  const previewChips = preview.items.slice(0, 4);

  return (
    <div style={{ padding: "26px 28px" }}>
      <p className="tpl-h1" style={{ marginBottom: 4 }}>
        {LABEL_WHEN_SHOULD_WE_WARN_YOU}
      </p>
      <p className="tpl-sub" style={{ marginBottom: 18 }}>
        {TEXT_STOCK_ALERTS_STEP_DESCRIPTION}
      </p>

      <div className="tpl-g2" role="radiogroup" aria-label={LABEL_WHEN_SHOULD_WE_WARN_YOU} style={{ marginBottom: 14 }}>
        <button
          type="button"
          role="radio"
          aria-checked={strategy === "daysOfCover"}
          aria-label={LABEL_BY_DAYS_OF_COVER}
          onClick={() => setStrategy("daysOfCover")}
          className={`tpl-tile${strategy === "daysOfCover" ? " tpl-on" : ""}`}
        >
          <div className="tpl-sp" style={{ width: "100%", marginBottom: 5 }}>
            <p className="tpl-tpr">{LABEL_BY_DAYS_OF_COVER}</p>
            <span className="tpl-chip tpl-on" style={{ fontSize: 11 }}>
              {LABEL_BETTER_BADGE}
            </span>
          </div>
          <p className="tpl-tn">{TEXT_BY_DAYS_OF_COVER_DESC}</p>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={strategy === "fixedQuantity"}
          aria-label={LABEL_BY_FIXED_QUANTITY}
          onClick={() => setStrategy("fixedQuantity")}
          className={`tpl-tile${strategy === "fixedQuantity" ? " tpl-on" : ""}`}
        >
          <p className="tpl-tpr" style={{ marginBottom: 5 }}>
            {LABEL_BY_FIXED_QUANTITY}
          </p>
          <p className="tpl-tn">{TEXT_BY_FIXED_QUANTITY_DESC}</p>
        </button>
      </div>

      <div className="tpl-card" style={{ marginBottom: 14 }}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between" style={{ marginBottom: 11 }}>
          <p className="tpl-h3">{LABEL_WARN_ME_WHEN_LESS_THAN}</p>
          <p style={{ color: "var(--tpl-a4)", fontSize: 19, fontWeight: 500 }}>
            {thresholdDays} {thresholdDays === 1 ? TEXT_DAY_SUFFIX : TEXT_DAYS_SUFFIX}
            <span className="tpl-ts"> {TEXT_OF_STOCK_LEFT_SUFFIX}</span>
          </p>
        </div>
        <input
          type="range"
          className="tpl-range"
          min={minThresholdDays}
          max={maxThresholdDays}
          step={1}
          value={thresholdDays}
          onChange={(e) => setThresholdDays(Number(e.target.value))}
          aria-label={LABEL_WARN_ME_WHEN_LESS_THAN}
          style={{ ["--tpl-range-fill" as string]: `${sliderPercent}%` }}
        />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="tpl-ts">{TEXT_ONE_DAY_RISKY}</span>
          <span className="tpl-ts">{TEXT_SEVEN_DAYS_LOTS_OF_CAPITAL}</span>
        </div>
      </div>

      <div className="tpl-card" style={{ marginBottom: 14 }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" style={{ marginBottom: 11 }}>
          <p className="tpl-h3">{TEXT_TODAY_YOU_WOULD_BE_WARNED_ABOUT_PREFIX}</p>
          <span className="tpl-chip tpl-w" style={{ flexShrink: 0 }}>
            {preview.affectedCount} {TEXT_ITEMS_SUFFIX}
          </span>
        </div>
        <div className="tpl-row" style={{ flexWrap: "wrap" }}>
          {previewChips.map((item) => (
            <span
              key={item.productId}
              className={`tpl-chip ${item.daysOfStockLeft <= 0 ? "tpl-bad" : "tpl-w"}`}
              style={{ borderRadius: 8 }}
            >
              {item.productName} &middot; {formatPreviewLabel(item.daysOfStockLeft)}
            </span>
          ))}
        </div>
        <p className="tpl-hint">{TEXT_SLIDE_LEFT_HINT}</p>
      </div>

      <div className="tpl-card" style={{ marginBottom: 18 }}>
        <div className="tpl-sp" style={{ borderBottom: "0.5px solid var(--tpl-bd3)", padding: "7px 0" }}>
          <div className="tpl-flex1" style={{ marginRight: 12 }}>
            <p className="tpl-tp" style={{ whiteSpace: "normal" }}>
              {LABEL_FAST_MOVERS_TITLE}
            </p>
            <p className="tpl-ts">{TEXT_FAST_MOVERS_DESC}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={fastMoverBoost}
            aria-label={LABEL_FAST_MOVERS_TITLE}
            onClick={() => setFastMoverBoost(!fastMoverBoost)}
            className={`tpl-tog${fastMoverBoost ? " tpl-on" : ""}`}
          >
            <span />
          </button>
        </div>
        <div className="tpl-sp" style={{ padding: "7px 0" }}>
          <div className="tpl-flex1" style={{ marginRight: 12 }}>
            <p className="tpl-tp" style={{ whiteSpace: "normal" }}>
              {LABEL_DAILY_SUMMARY_TITLE}
            </p>
            <p className="tpl-ts">{TEXT_DAILY_SUMMARY_DESC}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={dailySummary}
            aria-label={LABEL_DAILY_SUMMARY_TITLE}
            onClick={() => setDailySummary(!dailySummary)}
            className={`tpl-tog${dailySummary ? " tpl-on" : ""}`}
          >
            <span />
          </button>
        </div>
      </div>

      <div className="tpl-row" style={{ flexWrap: "wrap", rowGap: 8 }}>
        <button
          type="button"
          className="tpl-btnp"
          style={{ width: "auto", marginBottom: 0, whiteSpace: "nowrap" }}
          onClick={onContinue}
        >
          {BUTTON_CONTINUE} <i className="ti ti-arrow-right" aria-hidden />
        </button>
        <button type="button" className="tpl-txt" style={{ whiteSpace: "nowrap" }} onClick={onUseDefault}>
          {BUTTON_USE_THE_DEFAULT}
        </button>
        <p className="tpl-ts" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
          {TEXT_SAVED_AUTOMATICALLY}
        </p>
      </div>
    </div>
  );
}
