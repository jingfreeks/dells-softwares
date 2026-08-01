import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  STORE_NAME,
  APP_NAME,
  SEG_SIGN_IN,
  SEG_CREATE_ACCOUNT,
  PAGE_HEADING_WELCOME_BACK,
  TEXT_LOGIN_SUBHEAD,
  BUTTON_CONTINUE_WITH_GOOGLE,
  TEXT_OR,
  LABEL_EMAIL_ADDRESS,
  LABEL_PASSWORD,
  LABEL_KEEP_SIGNED_IN,
  LINK_FORGOT_PASSWORD,
  BUTTON_SIGNING_IN,
  TEXT_NEW_TO_APP_PROMPT,
  LINK_CREATE_AN_ACCOUNT,
  TEXT_CONTACT_SUPPORT,
  ARIA_SHOW_PASSWORD,
  ARIA_HIDE_PASSWORD,
  TEXT_LOGIN_PREVIEW_HEADLINE,
  TEXT_LOGIN_PREVIEW_TAGLINE,
  TEXT_LOGIN_PREVIEW_BULLET_1,
  TEXT_LOGIN_PREVIEW_BULLET_2,
  TEXT_LOGIN_PREVIEW_BULLET_3,
  TEXT_LOGIN_PREVIEW_DASHBOARD_LABEL,
  TEXT_LOGIN_PREVIEW_LIVE,
  TEXT_LOGIN_PREVIEW_RECENT_SALES,
} from "@/lib";
import { useLoginForm } from "./hooks";
import "./login.css";

const PREVIEW_BULLETS = [TEXT_LOGIN_PREVIEW_BULLET_1, TEXT_LOGIN_PREVIEW_BULLET_2, TEXT_LOGIN_PREVIEW_BULLET_3];

const RECENT_SALES = [
  { icon: "ti-cash", tone: "", title: "Lucky Me Pancit Canton ×3", meta: "2 min ago · Cash", amount: "₱54.00" },
  {
    icon: "ti-device-mobile",
    tone: "",
    title: "Coke Sakto ×2, Skyflakes",
    meta: "14 min ago · GCash",
    amount: "₱78.50",
  },
  { icon: "ti-notebook", tone: "tpl-w", title: "Bear Brand 320g", meta: "48 min ago · Utang", amount: "₱132.00" },
];

export function Login() {
  const {
    user,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    toggleShowPassword,
    keepSignedIn,
    setKeepSignedIn,
    error,
    submitting,
    handleSubmit,
  } = useLoginForm();
  const navigate = useNavigate();

  if (user) return <Navigate to="/pos" replace />;

  return (
    <div className="tpl-root tpl-shell">
      <div className="tpl-form-pane">
        <div className="tpl-form-inner">
          <div className="tpl-brand">
            <span className="tpl-mark">{APP_NAME.charAt(0)}</span>
            <div>
              <p className="tpl-bn">{STORE_NAME}</p>
              <p className="tpl-bs">{APP_NAME}</p>
            </div>
          </div>

          <div className="tpl-seg" role="tablist">
            <button type="button" role="tab" aria-selected="true" className="tpl-on">
              {SEG_SIGN_IN}
            </button>
            <button type="button" role="tab" aria-selected="false" onClick={() => navigate("/register")}>
              {SEG_CREATE_ACCOUNT}
            </button>
          </div>

          <p className="tpl-h2">{PAGE_HEADING_WELCOME_BACK}</p>
          <p className="tpl-sub">{TEXT_LOGIN_SUBHEAD}</p>

          <button type="button" className="tpl-btn" disabled title="Google sign-in isn't set up yet">
            <i className="ti ti-brand-google" aria-hidden />
            {BUTTON_CONTINUE_WITH_GOOGLE}
          </button>

          <div className="tpl-or-row">
            <span className="line" />
            <span className="word">{TEXT_OR}</span>
            <span className="line" />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email" className="tpl-lbl">
              {LABEL_EMAIL_ADDRESS}
            </label>
            <div className={`tpl-fld${error ? " tpl-err" : ""}`}>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="tpl-sp" style={{ marginTop: 14 }}>
              <label htmlFor="password" className="tpl-lbl" style={{ margin: 0 }}>
                {LABEL_PASSWORD}
              </label>
              <Link to="/forgot-password" className="tpl-lnk">
                {LINK_FORGOT_PASSWORD}
              </Link>
            </div>
            <div className={`tpl-fld${error ? " tpl-err" : ""}`} style={{ marginTop: 7 }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                aria-label={showPassword ? ARIA_HIDE_PASSWORD : ARIA_SHOW_PASSWORD}
                className="tpl-eye-btn"
              >
                <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} aria-hidden />
              </button>
            </div>

            {error && (
              <p role="alert" className="tpl-emsg">
                <i className="ti ti-alert-circle" aria-hidden />
                {error}
              </p>
            )}

            <button
              type="button"
              role="checkbox"
              aria-checked={keepSignedIn}
              aria-label={LABEL_KEEP_SIGNED_IN}
              onClick={() => setKeepSignedIn(!keepSignedIn)}
              className="tpl-check-row"
              style={{ marginTop: 18 }}
            >
              <span className={`tpl-checkbox${keepSignedIn ? " tpl-on" : ""}`}>
                {keepSignedIn && <i className="ti ti-check" aria-hidden />}
              </span>
              <span className="tpl-check-label">{LABEL_KEEP_SIGNED_IN}</span>
            </button>

            <button type="submit" disabled={submitting} className="tpl-btnp" style={{ marginTop: 18 }}>
              {submitting && <span aria-hidden className="tpl-spinner" />}
              {submitting ? BUTTON_SIGNING_IN : SEG_SIGN_IN}
            </button>
          </form>

          <div className="tpl-divider" />

          <p className="tpl-foot">
            {TEXT_NEW_TO_APP_PROMPT}{" "}
            <Link to="/register" className="tpl-lnk" style={{ fontWeight: 500 }}>
              {LINK_CREATE_AN_ACCOUNT}
            </Link>
          </p>
          <p className="tpl-foot-fine">{TEXT_CONTACT_SUPPORT}</p>
        </div>
      </div>

      <div className="tpl-preview">
        <span className="tpl-chip tpl-on">
          {APP_NAME}
          <span className="tpl-dotg" />
        </span>
        <p className="tpl-headline">{TEXT_LOGIN_PREVIEW_HEADLINE}</p>
        <p className="tpl-tagline">{TEXT_LOGIN_PREVIEW_TAGLINE}</p>
        <div className="tpl-bullets">
          {PREVIEW_BULLETS.map((bullet) => (
            <p key={bullet}>
              <i className="ti ti-check tpl-acc" aria-hidden />
              {bullet}
            </p>
          ))}
        </div>

        <div className="tpl-dash-card">
          <div className="tpl-sp" style={{ marginBottom: 14 }}>
            <p className="tpl-h3">{TEXT_LOGIN_PREVIEW_DASHBOARD_LABEL}</p>
            <span className="tpl-chip tpl-g">{TEXT_LOGIN_PREVIEW_LIVE}</span>
          </div>
          <div className="tpl-g3">
            <div className="tpl-metric">
              <p className="tpl-mlbl">TODAY&apos;S SALES</p>
              <p className="tpl-mval">₱4,820</p>
              <p className="tpl-mfoot tpl-ok">▲ 12%</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">TRANSACTIONS</p>
              <p className="tpl-mval">37</p>
              <p className="tpl-mfoot">₱130 avg</p>
            </div>
            <div className="tpl-metric tpl-w">
              <p className="tpl-mlbl" style={{ color: "var(--tpl-warn)" }}>
                LOW STOCK
              </p>
              <p className="tpl-mval tpl-warn">3</p>
              <p className="tpl-mfoot tpl-warnd">Restock</p>
            </div>
          </div>
          <div className="tpl-card">
            <p className="tpl-h3" style={{ marginBottom: 11 }}>
              {TEXT_LOGIN_PREVIEW_RECENT_SALES}
            </p>
            {RECENT_SALES.map((sale) => (
              <div className="tpl-lr" key={sale.title}>
                <span className={`tpl-ic ${sale.tone}`}>
                  <i className={`ti ${sale.icon}`} aria-hidden />
                </span>
                <div className="tpl-flex1">
                  <p className="tpl-tp">{sale.title}</p>
                  <p className="tpl-ts">{sale.meta}</p>
                </div>
                <span className="tpl-tp">{sale.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
