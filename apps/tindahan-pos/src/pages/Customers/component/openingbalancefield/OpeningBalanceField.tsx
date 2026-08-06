import { selectOnFocus, LABEL_OPENING_BALANCE, TEXT_OPTIONAL_SUFFIX, HINT_OPENING_BALANCE } from "@/lib";

interface OpeningBalanceFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function OpeningBalanceField({ value, onChange }: OpeningBalanceFieldProps) {
  return (
    <div>
      <label htmlFor="custOpeningBalance" className="tpl-lbl">
        {LABEL_OPENING_BALANCE} <span style={{ color: "var(--tpl-t7)" }}>· {TEXT_OPTIONAL_SUFFIX}</span>
      </label>
      <div className="tpl-fld">
        <input
          id="custOpeningBalance"
          type="number"
          min="0"
          placeholder="0.00"
          value={value}
          onFocus={selectOnFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="tpl-hint" style={{ marginBottom: 20 }}>{HINT_OPENING_BALANCE}</p>
    </div>
  );
}
