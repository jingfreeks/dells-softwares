import {
  LABEL_SIGN_IN_METHOD,
  LABEL_SIGN_IN_PIN_TABLET,
  TEXT_SIGN_IN_PIN_TABLET_DESC,
  LABEL_SIGN_IN_PIN_EMAIL,
  TEXT_SIGN_IN_PIN_EMAIL_DESC,
} from "@/lib";
import type { SignInMethod } from "../../../lib";

const METHODS: { value: SignInMethod; title: string; desc: string }[] = [
  { value: "pin", title: LABEL_SIGN_IN_PIN_TABLET, desc: TEXT_SIGN_IN_PIN_TABLET_DESC },
  { value: "pin-email", title: LABEL_SIGN_IN_PIN_EMAIL, desc: TEXT_SIGN_IN_PIN_EMAIL_DESC },
];

interface SignInMethodSelectorProps {
  value: SignInMethod;
  onChange: (value: SignInMethod) => void;
}

export function SignInMethodSelector({ value, onChange }: SignInMethodSelectorProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="tpl-lbl">{LABEL_SIGN_IN_METHOD}</label>
      <div className="tpl-g2" style={{ gap: 8 }}>
        {METHODS.map((method) => (
          <button
            key={method.value}
            type="button"
            aria-pressed={value === method.value}
            onClick={() => onChange(method.value)}
            className={`tpl-tile${value === method.value ? " tpl-on" : ""}`}
            style={{ gap: 1 }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: value === method.value ? 500 : 400,
                color: value === method.value ? "var(--tpl-a4)" : "var(--tpl-t3)",
              }}
            >
              {method.title}
            </span>{" "}
            <span className="tpl-ts">{method.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
