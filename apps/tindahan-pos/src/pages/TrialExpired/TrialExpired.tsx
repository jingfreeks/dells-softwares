import { Link } from "react-router-dom";
import "@/pages/authTheme.css";

/** Trial Expired (approved design screen 51) — a one-time transitional screen, not a gate. */
export function TrialExpired() {
  return (
    <div
      className="tpl-root flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
      style={{ background: "radial-gradient(90% 80% at 90% 0%, #12244A 0%, #0B142A 45%, #070B14 100%)" }}
    >
      <i className="ti ti-hourglass-empty tpl-acc" style={{ fontSize: 40 }} aria-hidden />
      <p style={{ color: "var(--tpl-t1)", fontSize: 26, fontWeight: 500, maxWidth: "36ch" }}>
        Your free trial has ended.
      </p>
      <p className="tpl-ts" style={{ fontSize: 14, maxWidth: "44ch", lineHeight: 1.6 }}>
        You're back on Basic. Everything you've recorded — products, sales, customers — stays exactly
        where it is. Nothing has been deleted, and selling still works.
      </p>
      <div className="tpl-row" style={{ gap: 12, marginTop: 8 }}>
        <Link to="/pricing" className="tpl-btnp" style={{ width: "auto", padding: "0 24px" }}>
          Choose a plan
        </Link>
        <Link to="/admin" className="tpl-btn" style={{ width: "auto", padding: "0 20px" }}>
          Continue on Basic
        </Link>
      </div>
    </div>
  );
}
