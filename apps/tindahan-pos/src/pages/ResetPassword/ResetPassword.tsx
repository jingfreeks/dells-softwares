import { Link } from "react-router-dom";
import {
  APP_NAME,
  PAGE_HEADING_RESET_PASSWORD,
  LABEL_NEW_PASSWORD,
  LABEL_CONFIRM_NEW_PASSWORD,
  BUTTON_UPDATE_PASSWORD,
  BUTTON_UPDATING,
  TEXT_PASSWORD_UPDATED,
  LINK_CONTINUE_TO_APP,
} from "@/lib";
import { useResetPasswordForm } from "./hooks";
import "@/pages/authTheme.css";

// Deliberately does not gate on whether a user is already signed in --
// that's exactly the bug this page exists to fix. Following a password
// recovery link always establishes a session (Supabase parses it straight
// off the URL fragment), and Login's own `if (user) redirect` used to
// bounce that session away to the dashboard before anyone could ever set
// a new password. This page renders unconditionally and lets
// supabase.auth.updateUser() work against whatever session is active.
export function ResetPassword() {
  const { newPassword, setNewPassword, confirmNewPassword, setConfirmNewPassword, error, submitting, saved, handleSubmit } =
    useResetPasswordForm();

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
          {PAGE_HEADING_RESET_PASSWORD}
        </h1>

        {saved ? (
          <>
            <p role="status" className="tpl-sub" style={{ marginTop: 8 }}>
              {TEXT_PASSWORD_UPDATED}
            </p>
            {/* No display override: .tpl-btnp centres its label with flex in a
                fixed 46px box, and `display: block` dropped the label to the
                top of that box. Only the anchor's underline needs resetting. */}
            <Link to="/" className="tpl-btnp" style={{ textDecoration: "none", marginTop: 18 }}>
              {LINK_CONTINUE_TO_APP}
            </Link>
          </>
        ) : (
          <form style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }} onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="newPassword" className="tpl-lbl">
                {LABEL_NEW_PASSWORD}
              </label>
              <div className="tpl-fld">
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="tpl-lbl">
                {LABEL_CONFIRM_NEW_PASSWORD}
              </label>
              <div className="tpl-fld">
                <input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
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
              {submitting ? BUTTON_UPDATING : BUTTON_UPDATE_PASSWORD}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
