import { PESO, selectOnFocus, LABEL_AMOUNT_TENDERED, LABEL_CHANGE } from "@/lib";

interface CashPaymentFieldsProps {
  tendered: string;
  onTenderedChange: (value: string) => void;
  quickCashAmounts: number[];
  change: number | null;
}

export function CashPaymentFields({ tendered, onTenderedChange, quickCashAmounts, change }: CashPaymentFieldsProps) {
  return (
    <>
      {quickCashAmounts.length > 0 && (
        <div className="tpl-g4" style={{ marginTop: 14, marginBottom: 0, gap: 6 }}>
          {quickCashAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onTenderedChange(String(amount))}
              className={`tpl-opt${Number(tendered) === amount ? " tpl-on" : ""}`}
            >
              {PESO.format(amount).replace(".00", "")}
            </button>
          ))}
        </div>
      )}

      <label htmlFor="tendered" className="tpl-lbl" style={{ marginTop: 11 }}>
        {LABEL_AMOUNT_TENDERED}
      </label>
      <div className="tpl-fld">
        <input
          id="tendered"
          type="number"
          min="0"
          inputMode="decimal"
          value={tendered}
          onFocus={selectOnFocus}
          onChange={(e) => onTenderedChange(e.target.value)}
        />
      </div>

      {change !== null && change >= 0 && (
        <div className="tpl-note tpl-g" style={{ marginTop: 11, justifyContent: "space-between" }}>
          <span style={{ color: "var(--tpl-okd)", fontSize: 13 }}>{LABEL_CHANGE}</span>
          <span style={{ color: "var(--tpl-ok)", fontSize: 22, fontWeight: 500 }}>{PESO.format(change)}</span>
        </div>
      )}
    </>
  );
}
