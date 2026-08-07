import {
  PESO,
  LABEL_COUNT_YOUR_STARTING_CASH,
  TEXT_OPEN_REGISTER_STEP_DESCRIPTION,
  LABEL_HOW_MANY_OF_EACH,
  LABEL_STARTING_FLOAT,
  LABEL_KEEP_AS_MINIMUM,
  TEXT_BLOCKS_CASH_OUTS_BELOW,
  LABEL_CASH_HEALTH_GOOD_TITLE,
  TEXT_CASH_HEALTH_GOOD_WITH_AVERAGE_PREFIX,
  TEXT_CASH_HEALTH_GOOD_WITH_AVERAGE_SUFFIX,
  TEXT_CASH_HEALTH_GOOD_NO_SALES,
  LABEL_CASH_HEALTH_LOW_TITLE,
  TEXT_CASH_HEALTH_LOW_WITH_AVERAGE_PREFIX,
  TEXT_CASH_HEALTH_LOW_WITH_AVERAGE_SUFFIX,
  TEXT_CASH_HEALTH_LOW_NO_SALES,
  LABEL_WHOS_ON_THE_REGISTER,
  TEXT_SALES_RECORDED_UNDER_THIS_PERSON,
  TEXT_YOU_SUFFIX,
  BUTTON_OPEN_THE_REGISTER,
  BUTTON_SKIP_THE_COUNT,
} from "@/lib";
import { useOpenRegisterStep } from "../useOpenRegisterStep";
import { denominationSubtotal } from "../lib";

interface OpenRegisterStepProps {
  onOpenRegister: () => void;
  onSkipCount: () => void;
}

export function OpenRegisterStep({ onOpenRegister, onSkipCount }: OpenRegisterStepProps) {
  const {
    denominations,
    denominationCounts,
    setDenominationCount,
    startingFloat,
    minimumToKeep,
    cashHealth,
    averageSaleValue,
    assignedStaffName,
    onOpenRegister: applyOpenRegister,
  } = useOpenRegisterStep();

  function handleOpenRegister() {
    applyOpenRegister();
    onOpenRegister();
  }

  const cashHealthGoodDetail =
    averageSaleValue > 0
      ? `${TEXT_CASH_HEALTH_GOOD_WITH_AVERAGE_PREFIX} ${PESO.format(averageSaleValue)}, ${TEXT_CASH_HEALTH_GOOD_WITH_AVERAGE_SUFFIX}`
      : TEXT_CASH_HEALTH_GOOD_NO_SALES;
  const cashHealthLowDetail =
    averageSaleValue > 0
      ? `${TEXT_CASH_HEALTH_LOW_WITH_AVERAGE_PREFIX} ${PESO.format(averageSaleValue)}, ${TEXT_CASH_HEALTH_LOW_WITH_AVERAGE_SUFFIX}`
      : TEXT_CASH_HEALTH_LOW_NO_SALES;

  return (
    <div style={{ padding: "26px 28px" }}>
      <p className="tpl-h1" style={{ marginBottom: 4 }}>
        {LABEL_COUNT_YOUR_STARTING_CASH}
      </p>
      <p className="tpl-sub" style={{ marginBottom: 18 }}>
        {TEXT_OPEN_REGISTER_STEP_DESCRIPTION}
      </p>

      <div className="tpl-card" style={{ marginBottom: 14 }}>
        <p className="tpl-seclbl">{LABEL_HOW_MANY_OF_EACH}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {denominations.map((def) => {
            const quantity = denominationCounts[def.key] ?? 0;
            const subtotal = denominationSubtotal(def, quantity);
            return (
              <div key={def.key} className="tpl-row" style={{ gap: 10 }}>
                <span style={{ width: 56, color: "var(--tpl-t4)", fontSize: 13, flex: "none" }}>{def.label}</span>
                <div className="tpl-fld tpl-mono" style={{ height: 34, flex: 1 }}>
                  <input
                    type="number"
                    min={0}
                    id={`denom-${def.key}`}
                    aria-label={def.label}
                    value={quantity === 0 ? "" : quantity}
                    placeholder="0"
                    onChange={(e) => setDenominationCount(def.key, Number(e.target.value) || 0)}
                  />
                </div>
                <span className="tpl-ts" style={{ width: 56, textAlign: "right", flex: "none" }}>
                  {PESO.format(subtotal)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tpl-g2" style={{ marginBottom: 14 }}>
        <div className="tpl-metric tpl-b">
          <p className="tpl-mlbl" style={{ color: "var(--tpl-a4)" }}>
            {LABEL_STARTING_FLOAT}
          </p>
          <p className="tpl-mval" style={{ fontSize: 26 }}>
            {PESO.format(startingFloat)}
          </p>
        </div>
        <div className="tpl-metric">
          <p className="tpl-mlbl">{LABEL_KEEP_AS_MINIMUM}</p>
          <p className="tpl-mval" style={{ fontSize: 26 }}>
            {PESO.format(minimumToKeep)}
          </p>
          <p className="tpl-mfoot">{TEXT_BLOCKS_CASH_OUTS_BELOW}</p>
        </div>
      </div>

      <div className={`tpl-note ${cashHealth.level === "good" ? "tpl-g" : "tpl-w"}`} style={{ marginBottom: 14 }}>
        <i className={`ti ti-info-circle${cashHealth.level === "good" ? " tpl-ok" : ""}`} aria-hidden />
        <div>
          <p className="tpl-nt" style={{ color: cashHealth.level === "good" ? "var(--tpl-okd)" : "var(--tpl-warn)" }}>
            {cashHealth.level === "good" ? LABEL_CASH_HEALTH_GOOD_TITLE : LABEL_CASH_HEALTH_LOW_TITLE}
          </p>
          <p className="tpl-ns" style={{ color: "var(--tpl-t7)" }}>
            {cashHealth.level === "good" ? cashHealthGoodDetail : cashHealthLowDetail}
          </p>
        </div>
      </div>

      <div className="tpl-card" style={{ marginBottom: 18 }}>
        <div className="tpl-sp">
          <div className="tpl-flex1">
            <p className="tpl-tp">{LABEL_WHOS_ON_THE_REGISTER}</p>
            <p className="tpl-ts">{TEXT_SALES_RECORDED_UNDER_THIS_PERSON}</p>
          </div>
          <span className="tpl-chip tpl-on">
            {assignedStaffName} {TEXT_YOU_SUFFIX} <i className="ti ti-chevron-down" aria-hidden />
          </span>
        </div>
      </div>

      <div className="tpl-row">
        <button
          type="button"
          className="tpl-btnp"
          style={{ width: "auto", height: 40, marginBottom: 0 }}
          onClick={handleOpenRegister}
        >
          {BUTTON_OPEN_THE_REGISTER} <i className="ti ti-arrow-right" aria-hidden />
        </button>
        <button type="button" className="tpl-txt" onClick={onSkipCount}>
          {BUTTON_SKIP_THE_COUNT}
        </button>
      </div>
    </div>
  );
}
