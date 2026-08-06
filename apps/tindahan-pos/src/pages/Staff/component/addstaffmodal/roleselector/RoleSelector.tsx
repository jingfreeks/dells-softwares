import {
  LABEL_ROLE,
  LABEL_ROLE_CASHIER_TITLE,
  TEXT_ROLE_CASHIER_DESC,
  LABEL_ROLE_SUPERVISOR_TITLE,
  TEXT_ROLE_SUPERVISOR_DESC,
  LABEL_ROLE_OWNER_TITLE,
  TEXT_ROLE_OWNER_DESC,
} from "@/lib";
import type { StaffRoleSelection } from "../../../lib";

const ROLES: { value: StaffRoleSelection; icon: string; title: string; desc: string }[] = [
  { value: "cashier", icon: "ti-shopping-cart", title: LABEL_ROLE_CASHIER_TITLE, desc: TEXT_ROLE_CASHIER_DESC },
  { value: "supervisor", icon: "ti-clipboard-check", title: LABEL_ROLE_SUPERVISOR_TITLE, desc: TEXT_ROLE_SUPERVISOR_DESC },
  { value: "owner", icon: "ti-crown", title: LABEL_ROLE_OWNER_TITLE, desc: TEXT_ROLE_OWNER_DESC },
];

interface RoleSelectorProps {
  value: StaffRoleSelection;
  onChange: (value: StaffRoleSelection) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="tpl-lbl">{LABEL_ROLE}</label>
      <div className="tpl-g3" style={{ gap: 7, margin: 0 }}>
        {ROLES.map((role) => (
          <button
            key={role.value}
            type="button"
            aria-pressed={value === role.value}
            onClick={() => onChange(role.value)}
            className={`tpl-tile${value === role.value ? " tpl-on" : ""}`}
          >
            <i className={`ti ${role.icon}`} aria-hidden />
            <span
              style={{
                fontSize: 13,
                fontWeight: value === role.value ? 500 : 400,
                color: value === role.value ? "var(--tpl-a4)" : "var(--tpl-t3)",
              }}
            >
              {role.title}
            </span>{" "}
            <span className="tpl-ts">{role.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
