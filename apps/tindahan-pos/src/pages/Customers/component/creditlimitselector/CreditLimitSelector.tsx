import { useRef } from "react";
import {
  selectOnFocus,
  LABEL_CREDIT_LIMIT,
  LABEL_CREDIT_LIMIT_OPTIONAL,
  PLACEHOLDER_NO_LIMIT,
  HINT_CREDIT_LIMIT_AVERAGE,
  BUTTON_CREDIT_LIMIT_OTHER,
} from "@/lib";

const PRESETS = [300, 500, 1000];

interface CreditLimitSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CreditLimitSelector({ value, onChange }: CreditLimitSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPreset = PRESETS.some((preset) => String(preset) === value.trim());

  return (
    <div>
      <label className="tpl-lbl">{LABEL_CREDIT_LIMIT}</label>
      <div className="tpl-g4" style={{ gap: 7, marginBottom: 8 }}>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(String(preset))}
            className={`tpl-tile${String(preset) === value.trim() ? " tpl-on" : ""}`}
            style={{ height: 34, padding: 0, justifyContent: "center", alignItems: "center", width: "100%" }}
          >
            <p className="tpl-tn">₱{preset.toLocaleString()}</p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className={`tpl-tile tpl-dash${value.trim() !== "" && !isPreset ? " tpl-on" : ""}`}
          style={{ height: 34, padding: 0 }}
        >
          <p className="tpl-tn">{BUTTON_CREDIT_LIMIT_OTHER}</p>
        </button>
      </div>

      <div className="tpl-fld" style={{ marginBottom: 8 }}>
        <input
          ref={inputRef}
          aria-label={LABEL_CREDIT_LIMIT_OPTIONAL}
          type="number"
          min="0"
          placeholder={PLACEHOLDER_NO_LIMIT}
          value={value}
          onFocus={selectOnFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="tpl-hint" style={{ marginBottom: 14 }}>{HINT_CREDIT_LIMIT_AVERAGE}</p>
    </div>
  );
}
