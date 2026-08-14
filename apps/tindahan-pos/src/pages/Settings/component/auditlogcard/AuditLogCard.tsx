import {
  LABEL_AUDIT_LOG_HEADING,
  LABEL_AUDIT_ACTOR_PREFIX,
  LABEL_AUDIT_REASON_PREFIX,
  LABEL_LOADING,
  EMPTY_STATE_NO_AUDIT_LOG_ENTRIES,
} from "@/lib";
import type { AuditLogRow } from "../../hooksAuditLog";

interface AuditLogCardProps {
  entries: AuditLogRow[];
  loading: boolean;
  loadError: string | null;
}

export function AuditLogCard({ entries, loading, loadError }: AuditLogCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 14 }}>
      <p className="tpl-h3" style={{ marginBottom: 14 }}>
        {LABEL_AUDIT_LOG_HEADING}
      </p>

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

      {!loading && !loadError && entries.length === 0 && (
        <p className="tpl-ts" style={{ padding: "24px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_AUDIT_LOG_ENTRIES}
        </p>
      )}

      {!loading &&
        entries.map((entry) => (
          <div key={entry.id} className="tpl-lr" style={{ padding: "11px 0", alignItems: "flex-start" }}>
            <div className="tpl-flex1">
              <p style={{ color: "var(--tpl-t2)", fontSize: 14, fontWeight: 500 }}>
                {entry.actionLabel} &middot; {entry.entityLabel}
              </p>
              <p className="tpl-ts">
                {LABEL_AUDIT_ACTOR_PREFIX} {entry.actorName} &middot; {new Date(entry.createdAt).toLocaleString()}
              </p>
              {entry.reason && (
                <p className="tpl-ts" style={{ marginTop: 2 }}>
                  {LABEL_AUDIT_REASON_PREFIX} {entry.reason}
                </p>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
