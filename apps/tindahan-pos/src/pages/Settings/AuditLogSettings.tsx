import { PAGE_HEADING_AUDIT_LOG, TEXT_AUDIT_LOG_DESCRIPTION, useAuditLog } from "@/lib";
import { SettingsLayout, AuditLogCard } from "./component";

export function AuditLogSettings() {
  const { entries, loading, loadError } = useAuditLog();

  return (
    <SettingsLayout>
      <div className="tpl-hd">
        <div>
          <p className="tpl-h1" style={{ fontSize: 21 }}>
            {PAGE_HEADING_AUDIT_LOG}
          </p>
          <p className="tpl-sub">{TEXT_AUDIT_LOG_DESCRIPTION}</p>
        </div>
      </div>

      <AuditLogCard entries={entries} loading={loading} loadError={loadError} />
    </SettingsLayout>
  );
}
