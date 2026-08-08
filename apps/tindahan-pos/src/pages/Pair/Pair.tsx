import { Link } from "react-router-dom";
import {
  APP_NAME,
  LABEL_PAIR_THIS_DEVICE,
  TEXT_PAIR_INSTRUCTIONS,
  LABEL_PAIRING_CODE_ARIA,
  LABEL_DEVICE_NAME,
  PLACEHOLDER_DEVICE_NAME,
  TEXT_NAME_THIS_DEVICE_HINT,
  BUTTON_PAIR_WITH_THIS_STORE,
  BUTTON_PAIRING,
  TEXT_ONLY_OWNER_PIN_CAN_UNPAIR,
  LINK_BACK_TO_SIGN_IN,
} from "@/lib";
import "@/pages/authTheme.css";
import { usePairPage } from "./hooks";

export function Pair() {
  const { code, handleCodeChange, deviceName, setDeviceName, submitting, error, submitPairing } = usePairPage();

  return (
    <div
      className="tpl-root flex min-h-screen flex-col items-center justify-center p-9"
      style={{ background: "radial-gradient(90% 80% at 90% 0%, #12244A 0%, #0B142A 45%, #070B14 100%)" }}
    >
      <div className="tpl-card" style={{ maxWidth: 380, width: "100%", padding: "28px 26px" }}>
        <div className="tpl-row" style={{ gap: 11, marginBottom: 18 }}>
          <span
            className="tpl-ic tpl-b"
            style={{ width: 32, height: 32, borderRadius: 10, fontSize: 16, border: "0.5px solid rgba(76,141,255,.32)" }}
          >
            <i className="ti ti-device-tablet" aria-hidden />
          </span>
          <p className="tpl-h3">{LABEL_PAIR_THIS_DEVICE}</p>
        </div>

        <p style={{ color: "#8593AB", fontSize: 13, lineHeight: 1.55, marginBottom: 20 }}>{TEXT_PAIR_INSTRUCTIONS}</p>

        <form onSubmit={submitPairing} noValidate>
          <label htmlFor="pairingCode" className="tpl-lbl">
            {LABEL_PAIRING_CODE_ARIA}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 16 }}>
            <input
              id="pairingCode"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={6}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              style={{ fontFamily: "monospace", letterSpacing: "0.3em", fontSize: 22, textAlign: "center" }}
            />
          </div>

          <label htmlFor="deviceName" className="tpl-lbl">
            {LABEL_DEVICE_NAME}
          </label>
          <div className="tpl-fld" style={{ marginBottom: 6 }}>
            <input
              id="deviceName"
              type="text"
              autoComplete="off"
              placeholder={PLACEHOLDER_DEVICE_NAME}
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
          </div>
          <p className="tpl-hint" style={{ marginBottom: 16 }}>
            {TEXT_NAME_THIS_DEVICE_HINT}
          </p>

          {error && (
            <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
              <i className="ti ti-alert-circle" aria-hidden />
              {error}
            </p>
          )}

          <button
            type="submit"
            className="tpl-btnp"
            disabled={submitting || code.length !== 6 || !deviceName.trim()}
            style={{ marginBottom: 11 }}
          >
            {submitting ? BUTTON_PAIRING : BUTTON_PAIR_WITH_THIS_STORE}
          </button>
        </form>

        <p className="tpl-ts" style={{ textAlign: "center", marginBottom: 14 }}>
          {TEXT_ONLY_OWNER_PIN_CAN_UNPAIR}
        </p>

        <p style={{ textAlign: "center" }}>
          <Link to="/login" className="tpl-lnk">
            {LINK_BACK_TO_SIGN_IN}
          </Link>
        </p>
      </div>

      <p className="tpl-ts" style={{ marginTop: 20 }}>
        {APP_NAME}
      </p>
    </div>
  );
}
