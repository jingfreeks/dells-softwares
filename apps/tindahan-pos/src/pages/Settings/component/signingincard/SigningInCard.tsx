import { useState } from "react";
import {
  LABEL_SIGNING_IN,
  LABEL_PASSWORD,
  BUTTON_CHANGE,
  LABEL_YOUR_OVERRIDE_PIN,
  TEXT_OVERRIDE_PIN_DESC,
  LABEL_TWO_STEP_SIGN_IN,
  TEXT_TWO_STEP_SIGN_IN_DESC,
  LABEL_ON_BADGE,
  LABEL_OFF_BADGE,
} from "@/lib";

interface SigningInCardProps {
  overridePin: string | null;
  onRegeneratePin: () => void;
  twoStepSignIn: boolean;
  onTwoStepSignInChange: (value: boolean) => void;
  onChangePasswordClick: () => void;
}

export function SigningInCard({
  overridePin,
  onRegeneratePin,
  twoStepSignIn,
  onTwoStepSignInChange,
  onChangePasswordClick,
}: SigningInCardProps) {
  const [justRegenerated, setJustRegenerated] = useState(false);

  function handleRegenerate() {
    onRegeneratePin();
    setJustRegenerated(true);
    window.setTimeout(() => setJustRegenerated(false), 4000);
  }

  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {LABEL_SIGNING_IN}
      </p>

      <div
        className="tpl-sp"
        style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "0.5px solid var(--tpl-bd3)" }}
      >
        <div className="tpl-flex1">
          <p className="tpl-tp">{LABEL_PASSWORD}</p>
        </div>
        <button type="button" className="tpl-btn" style={{ width: "auto", height: 32, padding: "0 14px", marginBottom: 0 }} onClick={onChangePasswordClick}>
          {BUTTON_CHANGE}
        </button>
      </div>

      <div
        className="tpl-sp"
        style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "0.5px solid var(--tpl-bd3)" }}
      >
        <div className="tpl-flex1">
          <p className="tpl-tp">{LABEL_YOUR_OVERRIDE_PIN}</p>
          <p className="tpl-ts">{TEXT_OVERRIDE_PIN_DESC}</p>
        </div>
        <div className="tpl-row" style={{ gap: 9 }}>
          <span className="tpl-mono" style={{ color: "var(--tpl-t2)", fontSize: 15, letterSpacing: 3 }}>
            {justRegenerated && overridePin ? overridePin : "····"}
          </span>
          <button
            type="button"
            className="tpl-btn"
            style={{ width: "auto", height: 32, padding: "0 14px", marginBottom: 0 }}
            onClick={handleRegenerate}
          >
            {BUTTON_CHANGE}
          </button>
        </div>
      </div>

      <div className="tpl-sp">
        <div className="tpl-flex1">
          <p className="tpl-tp">
            {LABEL_TWO_STEP_SIGN_IN}{" "}
            <span className={`tpl-chip${twoStepSignIn ? " tpl-on" : " tpl-w"}`} style={{ fontSize: 11, padding: "1px 8px", marginLeft: 5 }}>
              {twoStepSignIn ? LABEL_ON_BADGE : LABEL_OFF_BADGE}
            </span>
          </p>
          <p className="tpl-ts">{TEXT_TWO_STEP_SIGN_IN_DESC}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={twoStepSignIn}
          aria-label={LABEL_TWO_STEP_SIGN_IN}
          onClick={() => onTwoStepSignInChange(!twoStepSignIn)}
          className={`tpl-tog${twoStepSignIn ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>
    </div>
  );
}
