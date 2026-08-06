import { LABEL_MOBILE_NUMBER, HINT_MOBILE_NUMBER_REQUIRED } from "@/lib";

interface PhoneNumberFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function PhoneNumberField({ value, onChange }: PhoneNumberFieldProps) {
  return (
    <div style={{ marginBottom: value.trim() ? 14 : 4 }}>
      <label htmlFor="custPhone" className="tpl-lbl">
        {LABEL_MOBILE_NUMBER}
      </label>
      <div className="tpl-fld">
        <input id="custPhone" type="tel" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {!value.trim() && <p className="tpl-hint" style={{ marginBottom: 14 }}>{HINT_MOBILE_NUMBER_REQUIRED}</p>}
    </div>
  );
}
