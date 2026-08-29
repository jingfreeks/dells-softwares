import { Link } from "react-router-dom";
import {
  APP_NAME,
  PAGE_HEADING_CHECK_YOUR_EMAIL,
  TEXT_CONFIRMATION_EMAIL_SENT_PREFIX,
  TEXT_CONFIRMATION_EMAIL_SENT_SUFFIX,
  LINK_BACK_TO_LOGIN,
} from "@/lib";
import "@/pages/authTheme.css";

// Was built with plain Tailwind slate/white utilities instead of the
// tpl-* dark theme every other auth screen uses (Login, Register, Pair) --
// this is the one place in the sign-up flow a light card flashed on top of
// an otherwise all-dark product.
export function ConfirmationSentScreen({ email }: { email: string }) {
  return (
    <div
      className="tpl-root flex min-h-screen items-center justify-center p-6"
      style={{ background: "radial-gradient(90% 80% at 90% 0%, #12244A 0%, #0B142A 45%, #070B14 100%)" }}
    >
      <div className="tpl-card" style={{ width: "100%", maxWidth: 380, padding: "32px 28px", textAlign: "center" }}>
        <p className="tpl-acc" style={{ fontSize: 13, fontWeight: 500 }}>
          {APP_NAME}
        </p>
        <h1 className="tpl-h2" style={{ marginTop: 4 }}>
          {PAGE_HEADING_CHECK_YOUR_EMAIL}
        </h1>
        <p role="status" className="tpl-sub" style={{ marginTop: 10, marginBottom: 0 }}>
          {TEXT_CONFIRMATION_EMAIL_SENT_PREFIX} <span style={{ color: "var(--tpl-t2)", fontWeight: 500 }}>{email}</span>
          {TEXT_CONFIRMATION_EMAIL_SENT_SUFFIX}
        </p>
        <Link to="/login" className="tpl-lnk" style={{ display: "inline-block", marginTop: 22, fontWeight: 500 }}>
          {LINK_BACK_TO_LOGIN}
        </Link>
      </div>
    </div>
  );
}
