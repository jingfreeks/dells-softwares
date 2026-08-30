import { Link } from "react-router-dom";
import {
  APP_NAME,
  PAGE_HEADING_FORGOT_PASSWORD,
  LABEL_EMAIL_ADDRESS,
  BUTTON_SEND_RESET_LINK,
  BUTTON_SENDING,
  TEXT_RESET_LINK_SENT_PREFIX,
  TEXT_RESET_LINK_SENT_SUFFIX,
  LINK_BACK_TO_LOGIN,
} from "@/lib";
import { useForgotPasswordForm } from "./hooks";
import "@/pages/authTheme.css";

// Was built with plain Tailwind slate/white utilities instead of the tpl-*
// dark theme every other auth screen uses (Login, Register, Pair) -- a
// light card flashed on top of an otherwise all-dark product whenever a
// cashier followed "Forgot password?" from the (correctly dark) Login page.
export function ForgotPassword() {
  const { email, setEmail, sent, submitting, error, handleSubmit } = useForgotPasswordForm();

  return (
    <div
      className="tpl-root flex min-h-screen items-center justify-center p-6"
      style={{ background: "radial-gradient(90% 80% at 90% 0%, #12244A 0%, #0B142A 45%, #070B14 100%)" }}
    >
      <div className="tpl-card" style={{ width: "100%", maxWidth: 380, padding: "32px 28px" }}>
        <p className="tpl-acc" style={{ fontSize: 13, fontWeight: 500 }}>
          {APP_NAME}
        </p>
        <h1 className="tpl-h2" style={{ marginTop: 4 }}>
          {PAGE_HEADING_FORGOT_PASSWORD}
        </h1>

        {sent ? (
          <p role="status" className="tpl-sub" style={{ marginTop: 8, marginBottom: 0 }}>
            {TEXT_RESET_LINK_SENT_PREFIX} <span style={{ color: "var(--tpl-t2)", fontWeight: 500 }}>{email}</span>
            {TEXT_RESET_LINK_SENT_SUFFIX}
          </p>
        ) : (
          <form style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }} onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="resetEmail" className="tpl-lbl">
                {LABEL_EMAIL_ADDRESS}
              </label>
              <div className="tpl-fld">
                <input
                  id="resetEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="tpl-emsg">
                <i className="ti ti-alert-circle" aria-hidden />
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="tpl-btnp">
              {submitting && <span aria-hidden className="tpl-spinner" />}
              {submitting ? BUTTON_SENDING : BUTTON_SEND_RESET_LINK}
            </button>
          </form>
        )}

        <p className="tpl-sub" style={{ marginTop: 22, marginBottom: 0, textAlign: "center" }}>
          <Link to="/login" className="tpl-lnk" style={{ fontWeight: 500 }}>
            {LINK_BACK_TO_LOGIN}
          </Link>
        </p>
      </div>
    </div>
  );
}
