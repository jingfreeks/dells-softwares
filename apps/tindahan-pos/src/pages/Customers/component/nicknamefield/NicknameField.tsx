import { LABEL_NICKNAME, TEXT_NICKNAME_SUFFIX } from "@/lib";

interface NicknameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function NicknameField({ value, onChange }: NicknameFieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor="custNickname" className="tpl-lbl">
        {LABEL_NICKNAME} <span style={{ color: "var(--tpl-t7)" }}>· {TEXT_NICKNAME_SUFFIX}</span>
      </label>
      <div className="tpl-fld">
        <input id="custNickname" type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
