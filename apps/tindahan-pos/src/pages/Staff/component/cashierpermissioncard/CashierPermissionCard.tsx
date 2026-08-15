import { HEADING_CASHIER_PERMISSIONS, LINK_EDIT_ROLE, TEXT_NEEDS_PIN, type Store } from "@/lib";
import { cashierPermissions } from "../../lib";

interface CashierPermissionCardProps {
  store: Store;
  onEditRole: () => void;
}

export function CashierPermissionCard({ store, onEditRole }: CashierPermissionCardProps) {
  const permissions = cashierPermissions(store);

  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{HEADING_CASHIER_PERMISSIONS}</p>
        <button type="button" onClick={onEditRole} className="tpl-lnk" style={{ background: "none", border: "none", cursor: "pointer" }}>
          {LINK_EDIT_ROLE}
        </button>
      </div>
      {permissions.map((permission) => (
        <div key={permission.label} className="tpl-sp" style={{ padding: "5px 0" }}>
          <span style={{ color: permission.state === "blocked" ? "var(--tpl-t6)" : "var(--tpl-t4)", fontSize: 13 }}>
            {permission.label}
          </span>
          {permission.state === "allowed" && <i className="ti ti-circle-check tpl-ok" style={{ fontSize: 17 }} />}
          {permission.state === "needs-pin" && <span className="tpl-warn" style={{ fontSize: 12 }}>{TEXT_NEEDS_PIN}</span>}
          {permission.state === "blocked" && <i className="ti ti-circle-x" style={{ fontSize: 17, color: "var(--tpl-t9)" }} />}
        </div>
      ))}
    </div>
  );
}
