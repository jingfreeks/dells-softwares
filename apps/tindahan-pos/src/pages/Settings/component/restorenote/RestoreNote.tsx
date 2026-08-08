import { LABEL_RESTORE_FROM_BACKUP, TEXT_RESTORE_DESC, BUTTON_RESTORE } from "@/lib";

export function RestoreNote() {
  return (
    <div className="tpl-note tpl-bad" style={{ marginBottom: 18 }}>
      <div className="tpl-flex1">
        <p className="tpl-nt" style={{ color: "var(--tpl-bad)" }}>
          {LABEL_RESTORE_FROM_BACKUP}
        </p>
        <p className="tpl-ns" style={{ color: "var(--tpl-bad)" }}>
          {TEXT_RESTORE_DESC}
        </p>
      </div>
      <span className="tpl-chip tpl-bad" aria-disabled="true" style={{ cursor: "not-allowed", opacity: 0.6 }}>
        {BUTTON_RESTORE}
      </span>
    </div>
  );
}
