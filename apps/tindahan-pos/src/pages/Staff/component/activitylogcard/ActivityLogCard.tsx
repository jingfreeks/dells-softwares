import { Link } from "react-router-dom";
import {
  HEADING_ACTIVITY_LOG,
  LINK_FULL_LOG,
  LABEL_LOADING,
  EMPTY_STATE_NO_ACTIVITY_YET,
  useAuditLog,
  formatDateTime,
} from "@/lib";

function iconForAction(action: string): { icon: string; variant: "" | "w" | "r" | "g" } {
  if (action === "sale_voided") return { icon: "ti-trash", variant: "r" };
  return { icon: "ti-notebook", variant: "" };
}

export function ActivityLogCard() {
  const { entries, loading, loadError } = useAuditLog({ limit: 5 });

  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{HEADING_ACTIVITY_LOG}</p>
        <Link to="/settings/audit-log" className="tpl-lnk">
          {LINK_FULL_LOG}
        </Link>
      </div>

      {loading && <p className="tpl-ts">{LABEL_LOADING}</p>}

      {!loading && loadError && (
        <p role="alert" className="tpl-emsg">
          <i className="ti ti-alert-circle" aria-hidden />
          {loadError}
        </p>
      )}

      {!loading && !loadError && entries.length === 0 && <p className="tpl-ts">{EMPTY_STATE_NO_ACTIVITY_YET}</p>}

      {!loading &&
        !loadError &&
        entries.map((entry) => {
          const { icon, variant } = iconForAction(entry.action);
          return (
            <div key={entry.id} className="tpl-lr" style={{ alignItems: "flex-start" }}>
              <span className={`tpl-ic${variant ? ` tpl-${variant}` : ""}`}>
                <i className={`ti ${icon}`} aria-hidden />
              </span>
              <div className="tpl-flex1">
                <p className="tpl-tp">
                  {entry.actionLabel} · {entry.entityLabel}
                </p>
                <p className="tpl-ts">
                  {entry.actorName} · {formatDateTime(entry.createdAt)}
                  {entry.reason ? ` · ${entry.reason}` : ""}
                </p>
              </div>
            </div>
          );
        })}
    </div>
  );
}
