import { LABEL_ROLE_CASHIER_TITLE, LABEL_ROLE_SUPERVISOR_TITLE, LABEL_ROLE_OWNER_TITLE, TEXT_A_ROLE_CAN_SUFFIX } from "@/lib";
import { rolePermissionChips, type StaffRoleSelection, type PermissionState } from "../../../lib";

const ROLE_TITLE: Record<StaffRoleSelection, string> = {
  cashier: `A ${LABEL_ROLE_CASHIER_TITLE.toUpperCase()}`,
  supervisor: `A ${LABEL_ROLE_SUPERVISOR_TITLE.toUpperCase()}`,
  owner: `AN ${LABEL_ROLE_OWNER_TITLE.toUpperCase()}`,
};

const CHIP_CLASS: Record<PermissionState, string> = {
  allowed: "tpl-chip tpl-g",
  "needs-pin": "tpl-chip tpl-w",
  blocked: "tpl-chip",
};

interface PermissionPreviewProps {
  role: StaffRoleSelection;
}

export function PermissionPreview({ role }: PermissionPreviewProps) {
  const chips = rolePermissionChips(role);

  return (
    <div className="tpl-card" style={{ background: "var(--tpl-gl3)", marginBottom: 14 }}>
      <p className="tpl-seclbl">
        {ROLE_TITLE[role]} {TEXT_A_ROLE_CAN_SUFFIX}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {chips.map((chip) => (
          <span key={chip.label} className={CHIP_CLASS[chip.state]}>
            {chip.label}
          </span>
        ))}
      </div>
    </div>
  );
}
