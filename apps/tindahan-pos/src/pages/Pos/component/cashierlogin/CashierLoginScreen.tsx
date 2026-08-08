import { PinKeypad } from "@/components";
import {
  useAuth,
  APP_NAME,
  LABEL_CASHIER_PICKER_HEADING,
  TEXT_ENTER_YOUR_PIN_SUFFIX,
  LABEL_CASHIER_PIN_ARIA,
  TEXT_FORGOT_PIN_PREFIX,
  LINK_SIGN_IN_WITH_EMAIL,
  TEXT_LOADING_STAFF,
  BUTTON_SWITCH_CASHIER,
  TEXT_GREETING_HI_PREFIX,
} from "@/lib";
import "@/pages/authTheme.css";
import { useCashierLoginScreen } from "./hooks";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CashierLoginScreen() {
  const { store, user } = useAuth();
  const {
    staffList,
    loadingStaff,
    loadError,
    selectedStaff,
    selectStaff,
    backToPicker,
    pin,
    setPin,
    pinError,
    submitting,
    submitPin,
    signInWithEmailInstead,
  } = useCashierLoginScreen();

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-PH", { weekday: "long", day: "numeric", month: "long" });
  const timeLabel = now.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className="tpl-root flex min-h-screen flex-col items-center justify-center p-9"
      style={{ background: "radial-gradient(90% 80% at 90% 0%, #12244A 0%, #0B142A 45%, #070B14 100%)" }}
    >
      <div className="tpl-row" style={{ gap: 11, marginBottom: 6 }}>
        <span className="tpl-mark">{APP_NAME.charAt(0)}</span>
        <p className="tpl-h3" style={{ fontSize: 18 }}>
          {store?.name}
        </p>
      </div>
      <p className="tpl-ts" style={{ marginBottom: 26 }}>
        {dateLabel} &middot; {timeLabel}
      </p>

      {!selectedStaff ? (
        <>
          <p className="tpl-seclbl">{LABEL_CASHIER_PICKER_HEADING}</p>
          {loadingStaff ? (
            <p className="tpl-ts">{TEXT_LOADING_STAFF}</p>
          ) : loadError ? (
            <p role="alert" className="tpl-emsg">
              <i className="ti ti-alert-circle" aria-hidden />
              {loadError}
            </p>
          ) : (
            <div className="tpl-row" style={{ gap: 16, marginBottom: 26, flexWrap: "wrap", justifyContent: "center" }}>
              {staffList.map((staffRow) => (
                <button
                  key={staffRow.id}
                  type="button"
                  className="tpl-av-btn"
                  onClick={() => selectStaff(staffRow.id)}
                >
                  <span className="tpl-av tpl-l tpl-n">
                    {staffRow.avatarUrl ? (
                      <img
                        src={staffRow.avatarUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      initialsOf(staffRow.name)
                    )}
                  </span>
                  <span className="tpl-ts">{staffRow.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p style={{ color: "var(--tpl-t4)", fontSize: 15, marginBottom: 16 }}>
            {TEXT_GREETING_HI_PREFIX} {selectedStaff.name.split(" ")[0]} &mdash; {TEXT_ENTER_YOUR_PIN_SUFFIX}
          </p>
          <PinKeypad
            length={4}
            value={pin}
            onChange={setPin}
            onSubmit={submitPin}
            disabled={submitting}
            ariaLabel={LABEL_CASHIER_PIN_ARIA}
          />
          {pinError && (
            <p role="alert" className="tpl-emsg" style={{ marginTop: 14, justifyContent: "center" }}>
              <i className="ti ti-alert-circle" aria-hidden />
              {pinError}
            </p>
          )}
          <button type="button" className="tpl-lnk" style={{ marginTop: 20 }} onClick={backToPicker}>
            {BUTTON_SWITCH_CASHIER}
          </button>
        </>
      )}

      <div className="tpl-row" style={{ gap: 22, marginTop: 20 }}>
        <span className="tpl-txt">
          {TEXT_FORGOT_PIN_PREFIX} {user?.name}
        </span>
        <button type="button" className="tpl-lnk" onClick={signInWithEmailInstead}>
          {LINK_SIGN_IN_WITH_EMAIL}
        </button>
      </div>
    </div>
  );
}
