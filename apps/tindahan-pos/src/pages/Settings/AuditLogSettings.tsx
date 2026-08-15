import { PAGE_HEADING_AUDIT_LOG, TEXT_AUDIT_LOG_DESCRIPTION } from "@/lib";
import { SettingsLayout, AuditLogCard } from "./component";
import { useAuditLogPage } from "./hooksAuditLog";

export function AuditLogSettings() {
  const { entries, loading, loadError } = useAuditLogPage();

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
