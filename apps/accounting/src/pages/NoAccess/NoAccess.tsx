import { StateScreen } from "@/components";
import {
  BUTTON_OPEN_POS,
  BUTTON_SIGN_OUT,
  BUTTON_TRY_AGAIN,
  HEADING_ERROR,
  HEADING_MODULE_OFF,
  HEADING_NO_ACCESS,
  HEADING_SIGNED_OUT,
  TEXT_ERROR,
  TEXT_MODULE_OFF,
  TEXT_MODULE_OFF_EXISTING,
  TEXT_NO_ACCESS_ASK,
  TEXT_NO_ACCESS_SIGNED_IN,
  TEXT_SIGNED_OUT,
  useSession,
} from "@/lib";

/**
 * The screen someone reaches when Accounting will not open, in the four
 * distinguishable ways that can happen.
 *
 * The design's central point about this screen: a permissions boundary must
 * not look like a failed login. Someone who is told only "no access" will
 * retype a correct password, and keep retyping it. So each case says which of
 * the four it is, and only the one that a password would actually fix offers
 * a way to sign in again.
 */
export function NoAccess({ reason }: { reason: "signed-out" | "module-off" | "no-permission" | "error" }) {
  const { refresh, signOut } = useSession();

  if (reason === "signed-out") {
    return (
      <StateScreen icon="ic-lock" heading={HEADING_SIGNED_OUT}>
        {TEXT_SIGNED_OUT}
      </StateScreen>
    );
  }

  if (reason === "error") {
    return (
      <StateScreen
        icon="ic-warn"
        heading={HEADING_ERROR}
        tone="bad"
        action={
          <button type="button" className="btn" onClick={refresh}>
            {BUTTON_TRY_AGAIN}
          </button>
        }
      >
        {TEXT_ERROR}
      </StateScreen>
    );
  }

  if (reason === "module-off") {
    return (
      <StateScreen icon="ic-lock" heading={HEADING_MODULE_OFF}>
        <p>{TEXT_MODULE_OFF}</p>
        {/* Reads survive every subscription state -- the database keeps the
            books readable and only refuses new writes, so this screen must not
            imply the records are gone. */}
        <p style={{ marginTop: 8 }}>{TEXT_MODULE_OFF_EXISTING}</p>
      </StateScreen>
    );
  }

  return (
    <StateScreen
      icon="ic-users"
      heading={HEADING_NO_ACCESS}
      action={
        <div className="row g8">
          <a className="btn" href="/">
            {BUTTON_OPEN_POS}
          </a>
          <button type="button" className="btn" onClick={() => void signOut()}>
            {BUTTON_SIGN_OUT}
          </button>
        </div>
      }
    >
      <p>{TEXT_NO_ACCESS_SIGNED_IN}</p>
      <p style={{ marginTop: 8 }}>{TEXT_NO_ACCESS_ASK}</p>
    </StateScreen>
  );
}
