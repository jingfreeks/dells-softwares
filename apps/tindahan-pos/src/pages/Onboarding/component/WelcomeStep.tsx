import {
  APP_NAME,
  STORE_NAME,
  TEXT_WELCOME_HEADLINE,
  TEXT_WELCOME_SUBTITLE,
  BUTTON_START_SETUP,
  BUTTON_SKIP_TO_REGISTER,
  TEXT_WELCOME_FOOTNOTE,
  LABEL_WHAT_WELL_DO,
  LABEL_STEPS_COUNT_CHIP,
  LABEL_STEP_STORE_PROFILE,
  TEXT_WELCOME_STEP_PROFILE_DESC,
  LABEL_STEP_ADD_PRODUCTS,
  TEXT_WELCOME_STEP_PRODUCTS_DESC,
  LABEL_STEP_STOCK_ALERTS,
  TEXT_WELCOME_STEP_STOCK_ALERTS_DESC,
  LABEL_STEP_OPEN_REGISTER,
  TEXT_WELCOME_STEP_OPEN_REGISTER_DESC,
  TEXT_ABOUT_LOWERCASE_PREFIX,
  TEXT_MIN_SUFFIX,
  TEXT_YOU_CAN_LEAVE_ANY_STEP_TITLE,
  TEXT_YOU_CAN_LEAVE_ANY_STEP_DESC,
} from "@/lib";
import "@/pages/authTheme.css";

const WELCOME_STEPS = [
  { label: LABEL_STEP_STORE_PROFILE, desc: TEXT_WELCOME_STEP_PROFILE_DESC, minutes: 1 },
  { label: LABEL_STEP_ADD_PRODUCTS, desc: TEXT_WELCOME_STEP_PRODUCTS_DESC, minutes: 4 },
  { label: LABEL_STEP_STOCK_ALERTS, desc: TEXT_WELCOME_STEP_STOCK_ALERTS_DESC, minutes: 1 },
  { label: LABEL_STEP_OPEN_REGISTER, desc: TEXT_WELCOME_STEP_OPEN_REGISTER_DESC, minutes: 2 },
];

interface WelcomeStepProps {
  onStartSetup: () => void;
  onSkipToRegister: () => void;
}

export function WelcomeStep({ onStartSetup, onSkipToRegister }: WelcomeStepProps) {
  return (
    <div
      className="tpl-root grid min-h-screen grid-cols-1 items-center gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-14 lg:p-14"
      style={{ background: "radial-gradient(90% 80% at 90% 0%, #12244A 0%, #0B142A 45%, #070B14 100%)" }}
    >
      <div>
        <div className="tpl-row" style={{ gap: 12, marginBottom: 26 }}>
          <span className="tpl-mark">{APP_NAME.charAt(0)}</span>
          <div>
            <p className="tpl-bn" style={{ fontSize: 15 }}>
              {APP_NAME}
            </p>
            <p className="tpl-bs">{STORE_NAME}</p>
          </div>
        </div>
        <p style={{ color: "var(--tpl-t1)", fontSize: 36, fontWeight: 500, lineHeight: 1.2, marginBottom: 12 }}>
          {TEXT_WELCOME_HEADLINE}
        </p>
        <p style={{ color: "#8593AB", fontSize: 15, lineHeight: 1.6, marginBottom: 26, maxWidth: "44ch" }}>
          {TEXT_WELCOME_SUBTITLE}
        </p>
        <div className="tpl-row" style={{ gap: 12, marginBottom: 16 }}>
          <button type="button" className="tpl-btnp" style={{ width: "auto", padding: "0 24px", marginBottom: 0 }} onClick={onStartSetup}>
            {BUTTON_START_SETUP} <i className="ti ti-arrow-right" aria-hidden />
          </button>
          <button
            type="button"
            className="tpl-btn"
            style={{ width: "auto", padding: "0 20px", marginBottom: 0 }}
            onClick={onSkipToRegister}
          >
            {BUTTON_SKIP_TO_REGISTER}
          </button>
        </div>
        <p className="tpl-ts" style={{ fontSize: 12.5 }}>
          {TEXT_WELCOME_FOOTNOTE}
        </p>
      </div>

      <div className="tpl-card" style={{ padding: "22px 24px" }}>
        <div className="tpl-sp" style={{ marginBottom: 14 }}>
          <p className="tpl-h3">{LABEL_WHAT_WELL_DO}</p>
          <span className="tpl-chip tpl-on">{LABEL_STEPS_COUNT_CHIP}</span>
        </div>
        {WELCOME_STEPS.map((item, i) => (
          <div key={item.label} className="tpl-lr" style={{ padding: "11px 0", alignItems: "flex-start" }}>
            <span
              className="tpl-av tpl-b"
              style={{ width: 28, height: 28, fontSize: 12, border: "0.5px solid rgba(76,141,255,.30)" }}
            >
              {i + 1}
            </span>
            <div className="tpl-flex1" style={{ marginLeft: 2 }}>
              <p style={{ color: "var(--tpl-t2)", fontSize: 14, fontWeight: 500 }}>{item.label}</p>
              <p className="tpl-ts" style={{ fontSize: 12.5 }}>
                {item.desc}
              </p>
            </div>
            <span className="tpl-ts" style={{ fontSize: 12 }}>
              {TEXT_ABOUT_LOWERCASE_PREFIX} {item.minutes} {TEXT_MIN_SUFFIX}
            </span>
          </div>
        ))}
        <div className="tpl-note tpl-b" style={{ marginTop: 16 }}>
          <i className="ti ti-info-circle tpl-acc" aria-hidden />
          <div>
            <p className="tpl-nt" style={{ color: "var(--tpl-a4)" }}>
              {TEXT_YOU_CAN_LEAVE_ANY_STEP_TITLE}
            </p>
            <p className="tpl-ns" style={{ color: "#8593AB" }}>
              {TEXT_YOU_CAN_LEAVE_ANY_STEP_DESC}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
