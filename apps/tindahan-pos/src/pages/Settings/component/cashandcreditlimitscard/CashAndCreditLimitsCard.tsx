import {
  LABEL_CASH_AND_CREDIT_LIMITS,
  LABEL_KEEP_IN_DRAWER,
  LABEL_DEFAULT_CREDIT_LIMIT,
  LABEL_CASHIER_CASH_OUT_CAP,
  LABEL_BLOCK_UTANG_PAST_LIMIT,
  LABEL_VOID_NEEDS_PIN,
  LABEL_WARN_LOW_ELOAD_FLOAT,
  LABEL_NOT_ENFORCED_YET,
  TEXT_CASH_LIMITS_NOT_ENFORCED,
} from "@/lib";
import { NotEnforcedNote, NotEnforcedChip } from "../notenforcednote";

interface CashAndCreditLimitsCardProps {
  keepInDrawer: number;
  onKeepInDrawerChange: (value: number) => void;
  defaultCreditLimit: number;
  onDefaultCreditLimitChange: (value: number) => void;
  cashierCashOutCap: number;
  onCashierCashOutCapChange: (value: number) => void;
  blockUtangPastLimit: boolean;
  onToggleBlockUtangPastLimit: () => void;
  voidNeedsPin: boolean;
  onToggleVoidNeedsPin: () => void;
  warnLowEloadFloat: boolean;
  onToggleWarnLowEloadFloat: () => void;
}

export function CashAndCreditLimitsCard({
  keepInDrawer,
  onKeepInDrawerChange,
  defaultCreditLimit,
  onDefaultCreditLimitChange,
  cashierCashOutCap,
  onCashierCashOutCapChange,
  blockUtangPastLimit,
  onToggleBlockUtangPastLimit,
  voidNeedsPin,
  onToggleVoidNeedsPin,
  warnLowEloadFloat,
  onToggleWarnLowEloadFloat,
}: CashAndCreditLimitsCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 18 }}>
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_CASH_AND_CREDIT_LIMITS}
      </p>

      <div className="tpl-g3" style={{ marginBottom: 14 }}>
        <div>
          <label htmlFor="feesKeepInDrawer" className="tpl-lbl">
            {LABEL_KEEP_IN_DRAWER}
            <NotEnforcedChip />
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="feesKeepInDrawer"
              type="number"
              min={0}
              value={keepInDrawer}
              onChange={(e) => onKeepInDrawerChange(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="feesDefaultCreditLimit" className="tpl-lbl">
            {LABEL_DEFAULT_CREDIT_LIMIT}
            <NotEnforcedChip />
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="feesDefaultCreditLimit"
              type="number"
              min={0}
              value={defaultCreditLimit}
              onChange={(e) => onDefaultCreditLimitChange(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <label htmlFor="feesCashierCashOutCap" className="tpl-lbl">
            {LABEL_CASHIER_CASH_OUT_CAP}
          </label>
          <div className="tpl-fld tpl-mono">
            <input
              id="feesCashierCashOutCap"
              type="number"
              min={0}
              value={cashierCashOutCap}
              onChange={(e) => onCashierCashOutCapChange(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      <div className="tpl-sp" style={{ padding: "6px 0", borderBottom: "0.5px solid var(--tpl-bd3)" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>
          {LABEL_BLOCK_UTANG_PAST_LIMIT}
          <NotEnforcedChip />
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={blockUtangPastLimit}
          aria-label={`${LABEL_BLOCK_UTANG_PAST_LIMIT} (${LABEL_NOT_ENFORCED_YET})`}
          onClick={onToggleBlockUtangPastLimit}
          className={`tpl-tog${blockUtangPastLimit ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>
      <div className="tpl-sp" style={{ padding: "6px 0", borderBottom: "0.5px solid var(--tpl-bd3)" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_VOID_NEEDS_PIN}</span>
        <button
          type="button"
          role="switch"
          aria-checked={voidNeedsPin}
          aria-label={LABEL_VOID_NEEDS_PIN}
          onClick={onToggleVoidNeedsPin}
          className={`tpl-tog${voidNeedsPin ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>
      <div className="tpl-sp" style={{ padding: "6px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>
          {LABEL_WARN_LOW_ELOAD_FLOAT}
          <NotEnforcedChip />
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={warnLowEloadFloat}
          aria-label={`${LABEL_WARN_LOW_ELOAD_FLOAT} (${LABEL_NOT_ENFORCED_YET})`}
          onClick={onToggleWarnLowEloadFloat}
          className={`tpl-tog${warnLowEloadFloat ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>

      <NotEnforcedNote>{TEXT_CASH_LIMITS_NOT_ENFORCED}</NotEnforcedNote>
    </div>
  );
}
