import { Link, Navigate } from "react-router-dom";
import {
  APP_NAME,
  SEG_SIGN_IN,
  LABEL_STORE_NAME,
  LABEL_OWNER_NAME,
  LABEL_EMAIL_ADDRESS,
  LABEL_PASSWORD,
  HINT_EMAIL_RECEIPT,
  HINT_PASSWORD_MIN_LENGTH,
  HINT_ADD_SYMBOL_TO_MAX_OUT,
  ARIA_SHOW_PASSWORD,
  ARIA_HIDE_PASSWORD,
  LABEL_AGREE_TO_TERMS_PREFIX,
  LINK_TERMS_OF_SERVICE,
  TEXT_AND,
  LINK_PRIVACY_POLICY,
  BUTTON_CREATE_ACCOUNT,
  BUTTON_CREATING_ACCOUNT,
  TEXT_HAVE_ACCOUNT_PROMPT,
  TEXT_CONTACT_SUPPORT,
  TEXT_REGISTER_PREVIEW_HEADLINE,
  TEXT_REGISTER_PREVIEW_TAGLINE,
  TEXT_REGISTER_STEP_1_TITLE,
  TEXT_REGISTER_STEP_1_SUB,
  TEXT_REGISTER_STEP_2_TITLE,
  TEXT_REGISTER_STEP_2_SUB,
  TEXT_REGISTER_STEP_3_TITLE,
  TEXT_REGISTER_STEP_3_SUB,
  TEXT_REGISTER_PREVIEW_DAY_LABEL,
  TEXT_REGISTER_PREVIEW_LIVE_IN,
  TEXT_REGISTER_CHECKLIST_LABEL,
  TEXT_REGISTER_CHECKLIST_1,
  TEXT_REGISTER_CHECKLIST_2,
  TEXT_REGISTER_CHECKLIST_3,
  TEXT_REGISTER_CHECKLIST_4,
  TEXT_REGISTER_CHECKLIST_PROGRESS,
  LINK_BACK_TO_HOME,
  TEXT_REGISTER_TRIAL_PREFIX,
  TEXT_REGISTER_TRIAL_THEN_PREFIX,
} from "@/lib";
import { staticPlanPriceLabel } from "@/lib/plan/staticPlans";
import { ConfirmationSentScreen,Header,Buttonsigninscreen,Googlebtnsignup } from "./component";
import { useRegisterForm } from "./hooks";
import "../authTheme.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Register() {
  const {
    user,
    selectedPlan,
    storeName,
    setStoreName,
    ownerName,
    setOwnerName,
    email,
    setEmail,
    password,
    setPassword,
    passwordStrength,
    showPassword,
    toggleShowPassword,
    agreedToTerms,
    setAgreedToTerms,
    error,
    submitting,
    awaitingConfirmation,
    handleSubmit,
    googleSubmitting,
    handleGoogleSignUp,
  } = useRegisterForm();

  if (user) return <Navigate to="/pos" replace />;
  if (awaitingConfirmation) return <ConfirmationSentScreen email={email} />;

  const emailIsValid = EMAIL_PATTERN.test(email);
  const canSubmit = !submitting && agreedToTerms;

  return (
    <div className="tpl-root tpl-shell">
      <div className="tpl-form-pane">
        <div className="tpl-form-inner">
          <Link to="/" className="tpl-lnk" style={{ display: "inline-block", marginBottom: 12, fontSize: 13 }}>
            {LINK_BACK_TO_HOME}
          </Link>
          <Header />

          <Buttonsigninscreen />
          <Googlebtnsignup
            agreedToTerms={agreedToTerms}
            submitting={googleSubmitting}
            onClick={handleGoogleSignUp}
          />

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="storeName" className="tpl-lbl">
              {LABEL_STORE_NAME}
            </label>
            <div className="tpl-fld" style={{ marginBottom: 14 }}>
              <input
                id="storeName"
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>

            <label htmlFor="ownerName" className="tpl-lbl">
              {LABEL_OWNER_NAME}
            </label>
            <div className="tpl-fld" style={{ marginBottom: 14 }}>
              <input
                id="ownerName"
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>

            <label htmlFor="regEmail" className="tpl-lbl">
              {LABEL_EMAIL_ADDRESS}
            </label>
            <div className={`tpl-fld${error ? " tpl-err" : emailIsValid ? " tpl-good" : ""}`}>
              <input
                id="regEmail"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {emailIsValid && !error && <i className="ti ti-check tpl-fld-ok" aria-hidden />}
            </div>
            <p className="tpl-strength-hint" style={{ marginBottom: 14 }}>
              {HINT_EMAIL_RECEIPT}
            </p>

            <label htmlFor="regPassword" className="tpl-lbl">
              {LABEL_PASSWORD}
            </label>
            <div className={`tpl-fld${error ? " tpl-err" : ""}`}>
              <input
                id="regPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
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

            {password ? (
              <>
                <div className="tpl-strength-row">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={i < passwordStrength.score ? "tpl-on" : ""} />
                  ))}
                </div>
                <p className="tpl-strength-hint">
                  <span className="tpl-ok">{passwordStrength.label}</span>
                  {passwordStrength.score < 4 && <> · {HINT_ADD_SYMBOL_TO_MAX_OUT}</>}
                </p>
              </>
            ) : (
              <p className="tpl-strength-hint">{HINT_PASSWORD_MIN_LENGTH}</p>
            )}

            {error && (
              <p role="alert" className="tpl-emsg" style={{ marginTop: -6, marginBottom: 12 }}>
                <i className="ti ti-alert-circle" aria-hidden />
                {error}
              </p>
            )}

            <div className="tpl-terms-row">
              <button
                type="button"
                role="checkbox"
                aria-checked={agreedToTerms}
                aria-label="I agree to the Terms of Service and Privacy Policy"
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                className={`tpl-checkbox${agreedToTerms ? " tpl-on" : ""}`}
                style={{ padding: 0 }}
              >
                {agreedToTerms && <i className="ti ti-check" aria-hidden />}
              </button>
              <span className="tpl-terms-label" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                {LABEL_AGREE_TO_TERMS_PREFIX}{" "}
                <Link to="/terms" className="tpl-lnk" onClick={(e) => e.stopPropagation()}>
                  {LINK_TERMS_OF_SERVICE}
                </Link>{" "}
                {TEXT_AND}{" "}
                <Link to="/privacy" className="tpl-lnk" onClick={(e) => e.stopPropagation()}>
                  {LINK_PRIVACY_POLICY}
                </Link>
                .
              </span>
            </div>

            <button type="submit" disabled={!canSubmit} className="tpl-btnp">
              {submitting && <span aria-hidden className="tpl-spinner" />}
              {submitting ? BUTTON_CREATING_ACCOUNT : BUTTON_CREATE_ACCOUNT}
            </button>
          </form>

          <div className="tpl-divider" />

          <p className="tpl-foot">
            {TEXT_HAVE_ACCOUNT_PROMPT}{" "}
            <Link to="/login" className="tpl-lnk" style={{ fontWeight: 500 }}>
              {SEG_SIGN_IN}
            </Link>
          </p>
          <p className="tpl-foot-fine">{TEXT_CONTACT_SUPPORT}</p>
        </div>
      </div>

      <div className="tpl-preview">
        <span className="tpl-chip tpl-on" style={{ alignSelf: "flex-start", marginBottom: 20 }}>
          {APP_NAME}
        </span>
        {selectedPlan && (
          <p className="tpl-chip" style={{ alignSelf: "flex-start", marginBottom: 12 }}>
            {TEXT_REGISTER_TRIAL_PREFIX}
            {selectedPlan.name}
            {TEXT_REGISTER_TRIAL_THEN_PREFIX}
            {staticPlanPriceLabel(selectedPlan)}
          </p>
        )}
        <p className="tpl-headline">{TEXT_REGISTER_PREVIEW_HEADLINE}</p>
        <p className="tpl-tagline">{TEXT_REGISTER_PREVIEW_TAGLINE}</p>

        <div className="tpl-steps">
          <div className="tpl-step">
            <span className="tpl-av tpl-b">1</span>
            <div>
              <p className="tpl-step-title tpl-active">{TEXT_REGISTER_STEP_1_TITLE}</p>
              <p className="tpl-ts">{TEXT_REGISTER_STEP_1_SUB}</p>
            </div>
          </div>
          <div className="tpl-step">
            <span className="tpl-av tpl-n">2</span>
            <div>
              <p className="tpl-step-title tpl-pending">{TEXT_REGISTER_STEP_2_TITLE}</p>
              <p className="tpl-ts">{TEXT_REGISTER_STEP_2_SUB}</p>
            </div>
          </div>
          <div className="tpl-step">
            <span className="tpl-av tpl-n">3</span>
            <div>
              <p className="tpl-step-title tpl-pending">{TEXT_REGISTER_STEP_3_TITLE}</p>
              <p className="tpl-ts">{TEXT_REGISTER_STEP_3_SUB}</p>
            </div>
          </div>
        </div>

        <div className="tpl-dash-card">
          <div className="tpl-sp" style={{ marginBottom: 14 }}>
            <p className="tpl-h3">{TEXT_REGISTER_PREVIEW_DAY_LABEL}</p>
            <span className="tpl-chip tpl-g">{TEXT_REGISTER_PREVIEW_LIVE_IN}</span>
          </div>
          <div className="tpl-g3">
            <div className="tpl-metric">
              <p className="tpl-mlbl">PRODUCTS</p>
              <p className="tpl-mval">124</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">STAFF</p>
              <p className="tpl-mval">2</p>
            </div>
            <div className="tpl-metric">
              <p className="tpl-mlbl">FIRST SALE</p>
              <p className="tpl-mval">₱54</p>
            </div>
          </div>
          <div className="tpl-card">
            <p className="tpl-h3" style={{ marginBottom: 11 }}>
              {TEXT_REGISTER_CHECKLIST_LABEL}
            </p>
            <div className="tpl-checklist-row">
              <i className="ti ti-circle-check" style={{ color: "var(--tpl-ok)" }} aria-hidden />
              <span className="tpl-checklist-label tpl-done">{TEXT_REGISTER_CHECKLIST_1}</span>
            </div>
            <div className="tpl-checklist-row">
              <i className="ti ti-circle-check" style={{ color: "var(--tpl-ok)" }} aria-hidden />
              <span className="tpl-checklist-label tpl-done">{TEXT_REGISTER_CHECKLIST_2}</span>
            </div>
            <div className="tpl-checklist-row">
              <i className="ti ti-circle-dashed tpl-acc" aria-hidden />
              <span className="tpl-checklist-label tpl-active">{TEXT_REGISTER_CHECKLIST_3}</span>
            </div>
            <div className="tpl-checklist-row" style={{ marginBottom: 12 }}>
              <i className="ti ti-circle" style={{ color: "var(--tpl-t8)" }} aria-hidden />
              <span className="tpl-checklist-label tpl-todo">{TEXT_REGISTER_CHECKLIST_4}</span>
            </div>
            <div className="tpl-bar">
              <i style={{ width: "55%" }} />
            </div>
            <p className="tpl-ts" style={{ marginTop: 7 }}>
              {TEXT_REGISTER_CHECKLIST_PROGRESS}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
