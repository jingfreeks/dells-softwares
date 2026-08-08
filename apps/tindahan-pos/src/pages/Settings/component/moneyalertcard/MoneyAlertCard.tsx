import {
  LABEL_ALERTS_MONEY,
  LABEL_DRAWER_OFF_BY_MORE_THAN,
  LABEL_UTANG_OLDER_THAN,
  TEXT_DAYS_SUFFIX,
  LABEL_WARN_LOW_ELOAD_FLOAT,
  LABEL_ANY_VOID_AFTER_PAYMENT,
} from "@/lib";

interface MoneyAlertCardProps {
  drawerVarianceThreshold: number;
  onDrawerVarianceThresholdChange: (value: number) => void;
  utangAgingThresholdDays: number;
  onUtangAgingThresholdDaysChange: (value: number) => void;
  warnLowEloadFloat: boolean;
  onToggleWarnLowEloadFloat: () => void;
  alertOnVoidAfterPayment: boolean;
  onToggleAlertOnVoidAfterPayment: () => void;
}

export function MoneyAlertCard({
  drawerVarianceThreshold,
  onDrawerVarianceThresholdChange,
  utangAgingThresholdDays,
  onUtangAgingThresholdDaysChange,
  warnLowEloadFloat,
  onToggleWarnLowEloadFloat,
  alertOnVoidAfterPayment,
  onToggleAlertOnVoidAfterPayment,
}: MoneyAlertCardProps) {
  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_ALERTS_MONEY}
      </p>

      <div className="tpl-sp" style={{ padding: "5px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_DRAWER_OFF_BY_MORE_THAN}</span>
        <div className="tpl-fld tpl-mono" style={{ height: 28, width: 70, justifyContent: "center" }}>
          <input
            type="number"
            min={0}
            value={drawerVarianceThreshold}
            onChange={(e) => onDrawerVarianceThresholdChange(Number(e.target.value) || 0)}
            aria-label={LABEL_DRAWER_OFF_BY_MORE_THAN}
            style={{ textAlign: "center" }}
          />
        </div>
      </div>

      <div className="tpl-sp" style={{ padding: "5px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_UTANG_OLDER_THAN}</span>
        <div className="tpl-row" style={{ gap: 5 }}>
          <div className="tpl-fld tpl-mono" style={{ height: 28, width: 60, justifyContent: "center" }}>
            <input
              type="number"
              min={0}
              value={utangAgingThresholdDays}
              onChange={(e) => onUtangAgingThresholdDaysChange(Number(e.target.value) || 0)}
              aria-label={LABEL_UTANG_OLDER_THAN}
              style={{ textAlign: "center" }}
            />
          </div>
          <span className="tpl-ts">{TEXT_DAYS_SUFFIX}</span>
        </div>
      </div>

      <div className="tpl-sp" style={{ padding: "4px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_WARN_LOW_ELOAD_FLOAT}</span>
        <button
          type="button"
          role="switch"
          aria-checked={warnLowEloadFloat}
          aria-label={LABEL_WARN_LOW_ELOAD_FLOAT}
          onClick={onToggleWarnLowEloadFloat}
          className={`tpl-tog${warnLowEloadFloat ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>
      <div className="tpl-sp" style={{ padding: "4px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_ANY_VOID_AFTER_PAYMENT}</span>
        <button
          type="button"
          role="switch"
          aria-checked={alertOnVoidAfterPayment}
          aria-label={LABEL_ANY_VOID_AFTER_PAYMENT}
          onClick={onToggleAlertOnVoidAfterPayment}
          className={`tpl-tog${alertOnVoidAfterPayment ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>
    </div>
  );
}
