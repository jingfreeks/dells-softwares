import type { SaleRecord } from "@/lib";
import {
  PESO,
  LABEL_YOU_SUFFIX,
  LABEL_EMAIL_LOGIN,
  LABEL_ROLE_ADMIN,
  LABEL_ROLE_CASHIER,
  LABEL_ROLE_SUPERVISOR_TITLE,
  LABEL_INACTIVE,
  TEXT_EDIT_STAFF_NAME_PROMPT,
} from "@/lib";
import type { StaffRow as StaffRowData } from "../../../hooks";
import { staffInitials, computeSalesToday, lastActiveLabel } from "../../../lib";
import { StaffActionsMenu } from "../../staffactionsmenu";

export const STAFF_ROW_COLUMNS = "minmax(0,2fr) 86px 92px minmax(0,1.2fr) 34px";

interface StaffRowProps {
  member: StaffRowData;
  currentUserId: string | undefined;
  sales: SaleRecord[];
  removingId: string | null;
  onEditName: (id: string, name: string) => void;
  onChangeRole: (id: string, roleCode: "SUPERVISOR" | "CASHIER") => void;
  onResetPassword: (email: string) => void;
  onSetPin: (id: string) => void;
  onToggleActive: (id: string, currentlyActive: boolean) => void;
  onRemove: (id: string) => void;
}

export function StaffRow({
  member,
  currentUserId,
  sales,
  removingId,
  onEditName,
  onChangeRole,
  onResetPassword,
  onSetPin,
  onToggleActive,
  onRemove,
}: StaffRowProps) {
  const isSelf = member.id === currentUserId;
  const salesToday = computeSalesToday(sales, member.name);

  function handleEditName() {
    const next = window.prompt(TEXT_EDIT_STAFF_NAME_PROMPT, member.name);
    if (next && next.trim() && next.trim() !== member.name) onEditName(member.id, next);
  }

  return (
    <div role="row" aria-label={member.name} className="tpl-trow" style={{ gridTemplateColumns: STAFF_ROW_COLUMNS, cursor: "default" }}>
      <div className="tpl-row">
        <span className={`tpl-av ${member.role === "admin" ? "tpl-b" : "tpl-g"}`} style={{ width: 30, height: 30, fontSize: 12 }}>
          {staffInitials(member.name)}
        </span>
        <div className="tpl-flex1">
          <p className="tpl-tp">
            {member.name}
            {isSelf && (
              <>
                {" "}
                <span style={{ color: "var(--tpl-t7)" }}>{LABEL_YOU_SUFFIX}</span>
              </>
            )}
          </p>
          <p className="tpl-ts">{LABEL_EMAIL_LOGIN}</p>
        </div>
      </div>

      <span className={`tpl-chip${member.role === "admin" ? " tpl-on" : ""}`} style={{ justifyContent: "center", fontSize: 11, padding: "3px 0" }}>
        {member.roleCode === "OWNER"
          ? LABEL_ROLE_ADMIN
          : member.roleCode === "SUPERVISOR"
            ? LABEL_ROLE_SUPERVISOR_TITLE
            : LABEL_ROLE_CASHIER}
      </span>

      <span className="tpl-tp tpl-right">{salesToday > 0 ? PESO.format(salesToday) : "—"}</span>

      <span className="tpl-ts" style={{ fontSize: 12 }}>
        {member.active ? lastActiveLabel(sales, member.name) : <span className="tpl-chip tpl-bad">{LABEL_INACTIVE}</span>}
      </span>

      <StaffActionsMenu
        canRemove={member.role === "cashier"}
        canChangeRole={member.role === "cashier"}
        roleCode={member.roleCode}
        removing={removingId === member.id}
        hasPin={member.hasPin}
        active={member.active}
        onEditName={handleEditName}
        onChangeRole={(roleCode) => onChangeRole(member.id, roleCode)}
        onResetPassword={() => onResetPassword(member.email)}
        onSetPin={() => onSetPin(member.id)}
        onToggleActive={() => onToggleActive(member.id, member.active)}
        onRemove={() => onRemove(member.id)}
      />
    </div>
  );
}
