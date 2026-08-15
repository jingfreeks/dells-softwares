import type { SaleRecord } from "@/lib";
import { COLUMN_PERSON, COLUMN_ROLE, COLUMN_SALES_TODAY, COLUMN_STATUS, LABEL_LOADING, EMPTY_STATE_NO_STAFF } from "@/lib";
import type { StaffRow as StaffRowData } from "../hooks";
import { StaffRow, STAFF_ROW_COLUMNS } from "./stafftable/staffrow";

interface StaffTableProps {
  staff: StaffRowData[];
  loading: boolean;
  sales: SaleRecord[];
  currentUserId: string | undefined;
  removingId: string | null;
  onEditName: (id: string, name: string) => void;
  onChangeRole: (id: string, roleCode: "SUPERVISOR" | "CASHIER") => void;
  onResetPassword: (email: string) => void;
  onSetPin: (id: string) => void;
  onToggleActive: (id: string, currentlyActive: boolean) => void;
  onRemove: (id: string) => void;
}

export function StaffTable({
  staff,
  loading,
  sales,
  currentUserId,
  removingId,
  onEditName,
  onChangeRole,
  onResetPassword,
  onSetPin,
  onToggleActive,
  onRemove,
}: StaffTableProps) {
  return (
    <div className="tpl-card" style={{ padding: 0, marginBottom: 14 }}>
      <div className="tpl-thead" style={{ gridTemplateColumns: STAFF_ROW_COLUMNS }}>
        <span>{COLUMN_PERSON}</span>
        <span>{COLUMN_ROLE}</span>
        <span className="tpl-right">{COLUMN_SALES_TODAY}</span>
        <span>{COLUMN_STATUS}</span>
        <span />
      </div>

      {loading && (
        <p className="tpl-ts" style={{ padding: "32px 15px", textAlign: "center" }}>
          {LABEL_LOADING}
        </p>
      )}

      {!loading &&
        staff.map((member) => (
          <StaffRow
            key={member.id}
            member={member}
            currentUserId={currentUserId}
            sales={sales}
            removingId={removingId}
            onEditName={onEditName}
            onChangeRole={onChangeRole}
            onResetPassword={onResetPassword}
            onSetPin={onSetPin}
            onToggleActive={onToggleActive}
            onRemove={onRemove}
          />
        ))}

      {!loading && staff.length === 0 && (
        <p className="tpl-ts" style={{ padding: "32px 15px", textAlign: "center" }}>
          {EMPTY_STATE_NO_STAFF}
        </p>
      )}
    </div>
  );
}
