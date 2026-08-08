import { LABEL_AUTOMATIC_BACKUP, LABEL_BACK_UP_TO_CLOUD, LABEL_HOW_OFTEN, LABEL_ONLY_ON_WIFI } from "@/lib";
import { type BackupFrequency, BACKUP_FREQUENCIES } from "../../backupMock";

interface AutomaticBackupCardProps {
  cloudBackupEnabled: boolean;
  onToggleCloudBackupEnabled: () => void;
  frequency: BackupFrequency;
  onFrequencyChange: (frequency: BackupFrequency) => void;
  wifiOnly: boolean;
  onToggleWifiOnly: () => void;
}

export function AutomaticBackupCard({
  cloudBackupEnabled,
  onToggleCloudBackupEnabled,
  frequency,
  onFrequencyChange,
  wifiOnly,
  onToggleWifiOnly,
}: AutomaticBackupCardProps) {
  function cycleFrequency() {
    const index = BACKUP_FREQUENCIES.indexOf(frequency);
    onFrequencyChange(BACKUP_FREQUENCIES[(index + 1) % BACKUP_FREQUENCIES.length]);
  }

  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_AUTOMATIC_BACKUP}
      </p>

      <div className="tpl-sp" style={{ padding: "4px 0", borderBottom: "0.5px solid var(--tpl-bd3)" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_BACK_UP_TO_CLOUD}</span>
        <button
          type="button"
          role="switch"
          aria-checked={cloudBackupEnabled}
          aria-label={LABEL_BACK_UP_TO_CLOUD}
          onClick={onToggleCloudBackupEnabled}
          className={`tpl-tog${cloudBackupEnabled ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>

      <div className="tpl-sp" style={{ padding: "7px 0", borderBottom: "0.5px solid var(--tpl-bd3)" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_HOW_OFTEN}</span>
        <button
          type="button"
          className="tpl-btn"
          style={{ width: "auto", height: 32, padding: "0 14px", marginBottom: 0, whiteSpace: "nowrap" }}
          onClick={cycleFrequency}
        >
          {frequency}
        </button>
      </div>

      <div className="tpl-sp" style={{ padding: "7px 0" }}>
        <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{LABEL_ONLY_ON_WIFI}</span>
        <button
          type="button"
          role="switch"
          aria-checked={wifiOnly}
          aria-label={LABEL_ONLY_ON_WIFI}
          onClick={onToggleWifiOnly}
          className={`tpl-tog${wifiOnly ? " tpl-on" : ""}`}
        >
          <span />
        </button>
      </div>
    </div>
  );
}
