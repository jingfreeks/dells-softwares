import { LABEL_DANGER_ZONE, TEXT_DELETE_ACCOUNT_WARNING, BUTTON_DELETE_MY_ACCOUNT } from "@/lib";

export function DangerZoneCard({ onDeleteClick }: { onDeleteClick: () => void }) {
  return (
    <div className="tpl-note tpl-bad" style={{ alignItems: "center" }}>
      <div className="tpl-flex1">
        <p className="tpl-nt" style={{ color: "var(--tpl-bad)" }}>
          {LABEL_DANGER_ZONE}
        </p>
        <p className="tpl-ns" style={{ color: "var(--tpl-bad)" }}>
          {TEXT_DELETE_ACCOUNT_WARNING}
        </p>
      </div>
      <button type="button" className="tpl-chip tpl-bad" onClick={onDeleteClick}>
        {BUTTON_DELETE_MY_ACCOUNT}
      </button>
    </div>
  );
}
