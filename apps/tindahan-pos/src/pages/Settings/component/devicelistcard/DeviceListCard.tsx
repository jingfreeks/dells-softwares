import {
  LABEL_PAIRED_DEVICES_HEADING,
  BUTTON_GENERATE_PAIRING_CODE,
  TEXT_PAIRING_CODE_EXPIRES_PREFIX,
  BUTTON_DISMISS,
  LABEL_PAIRED_BY_PREFIX,
  BUTTON_UNPAIR,
  LABEL_LOADING,
  EMPTY_STATE_NO_DEVICES,
  formatDate,
  formatTime,
} from "@/lib";
import type { DeviceRow } from "../../hooksDevices";

interface DeviceListCardProps {
  devices: DeviceRow[];
  loading: boolean;
  loadError: string | null;
  generatedCode: string | null;
  codeExpiresAt: string | null;
  generating: boolean;
  generateError: string | null;
  onGenerateCode: () => void;
  onDismissCode: () => void;
  onUnpairClick: (deviceId: string) => void;
}

export function DeviceListCard({
  devices,
  loading,
  loadError,
  generatedCode,
  codeExpiresAt,
  generating,
  generateError,
  onGenerateCode,
  onDismissCode,
  onUnpairClick,
}: DeviceListCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <div className="tpl-sp" style={{ marginBottom: 14 }}>
        <p className="tpl-h3">{LABEL_PAIRED_DEVICES_HEADING}</p>
        <button type="button" className="tpl-btn" style={{ width: "auto", marginBottom: 0 }} onClick={onGenerateCode} disabled={generating}>
          <i className="ti ti-plus" aria-hidden />
          {BUTTON_GENERATE_PAIRING_CODE}
        </button>
      </div>

      {generateError && (
        <p role="alert" className="tpl-emsg" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-circle" aria-hidden />
          {generateError}
        </p>
      )}

      {generatedCode && (
        <div className="tpl-note tpl-b" style={{ marginBottom: 14, flexDirection: "column", alignItems: "center" }}>
          <p
            className="tpl-mono"
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: "0.3em", marginBottom: 6, color: "var(--tpl-t1)" }}
          >
            {generatedCode}
          </p>
          {codeExpiresAt && (
            <p className="tpl-ts">
              {TEXT_PAIRING_CODE_EXPIRES_PREFIX} {formatTime(codeExpiresAt)}
            </p>
          )}
          <button type="button" className="tpl-txt" onClick={onDismissCode} style={{ marginTop: 6 }}>
            {BUTTON_DISMISS}
          </button>
        </div>
      )}

      {loading && (
        <p className="tpl-ts" style={{ padding: "24px 0", textAlign: "center" }}>
          {LABEL_LOADING}
        </p>
      )}

      {loadError && (
        <p role="alert" className="tpl-emsg">
          <i className="ti ti-alert-circle" aria-hidden />
          {loadError}
        </p>
      )}

      {!loading && !loadError && devices.length === 0 && (
        <p className="tpl-ts" style={{ padding: "24px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_DEVICES}
        </p>
      )}

      {!loading &&
        devices.map((device) => (
          <div key={device.id} className="tpl-lr" style={{ padding: "11px 0" }}>
            <div className="tpl-flex1">
              <p style={{ color: "var(--tpl-t2)", fontSize: 14, fontWeight: 500 }}>{device.name}</p>
              <p className="tpl-ts">
                {LABEL_PAIRED_BY_PREFIX} {device.pairedByName} &middot; {formatDate(device.pairedAt)}
              </p>
            </div>
            <button type="button" className="tpl-txt" style={{ color: "var(--tpl-bad)" }} onClick={() => onUnpairClick(device.id)}>
              {BUTTON_UNPAIR}
            </button>
          </div>
        ))}
    </div>
  );
}
