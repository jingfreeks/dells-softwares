import { Modal } from "@/components";
import {
  PESO,
  HEADING_SHIFT_HISTORY,
  ARIA_CLOSE_MODAL,
  COLUMN_SHIFT_DATE,
  COLUMN_CASHIER,
  COLUMN_OPENING_CASH,
  COLUMN_CLOSING_CASH,
  COLUMN_VARIANCE,
  COLUMN_SALES,
  COLUMN_TRANSACTIONS,
  COLUMN_STATUS,
  LABEL_LOADING,
  EMPTY_STATE_NO_SHIFT_HISTORY,
  TEXT_SHIFT_IN_PROGRESS,
  TEXT_SHIFT_COMPLETED,
  TEXT_SHIFT_NO_COUNT,
  formatDate,
} from "@/lib";
import { useShiftHistory, type ShiftHistoryRow } from "../../hooksShifts";

interface ShiftHistoryModalProps {
  onClose: () => void;
}

function statusLabel(status: ShiftHistoryRow["status"]): string {
  if (status === "in-progress") return TEXT_SHIFT_IN_PROGRESS;
  if (status === "no-count") return TEXT_SHIFT_NO_COUNT;
  return TEXT_SHIFT_COMPLETED;
}

export function ShiftHistoryModal({ onClose }: ShiftHistoryModalProps) {
  const { shifts, loading, loadError } = useShiftHistory();

  return (
    <Modal open onClose={onClose} labelledBy="shiftHistoryHeading" maxWidth={720} style={{ overflowX: "auto" }}>
      <div className="tpl-sp" style={{ marginBottom: 14 }}>
        <p id="shiftHistoryHeading" className="tpl-h3">{HEADING_SHIFT_HISTORY}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={ARIA_CLOSE_MODAL}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 18, padding: 4 }}
        >
          <i className="ti ti-x" aria-hidden />
        </button>
      </div>

      {loading && <p className="tpl-ts">{LABEL_LOADING}</p>}

      {!loading && loadError && (
        <p role="alert" className="tpl-emsg">
          <i className="ti ti-alert-circle" aria-hidden />
          {loadError}
        </p>
      )}

      {!loading && !loadError && shifts.length === 0 && <p className="tpl-ts">{EMPTY_STATE_NO_SHIFT_HISTORY}</p>}

      {!loading && !loadError && shifts.length > 0 && (
        <div style={{ minWidth: 640 }}>
          <div
            className="tpl-thead"
            style={{ gridTemplateColumns: "110px minmax(0,1.3fr) 80px 80px 80px 90px 90px minmax(0,1fr)" }}
          >
            <span>{COLUMN_SHIFT_DATE}</span>
            <span>{COLUMN_CASHIER}</span>
            <span className="tpl-right">{COLUMN_OPENING_CASH}</span>
            <span className="tpl-right">{COLUMN_CLOSING_CASH}</span>
            <span className="tpl-right">{COLUMN_VARIANCE}</span>
            <span className="tpl-right">{COLUMN_SALES}</span>
            <span className="tpl-right">{COLUMN_TRANSACTIONS}</span>
            <span>{COLUMN_STATUS}</span>
          </div>

          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="tpl-trow"
              style={{
                gridTemplateColumns: "110px minmax(0,1.3fr) 80px 80px 80px 90px 90px minmax(0,1fr)",
                cursor: "default",
              }}
            >
              <span className="tpl-ts">{formatDate(shift.createdAt)}</span>
              <span className="tpl-tp">{shift.staffName}</span>
              <span className="tpl-ts tpl-right">{PESO.format(shift.openingFloat ?? 0)}</span>
              <span className="tpl-ts tpl-right">{shift.closingFloat === null ? "—" : PESO.format(shift.closingFloat)}</span>
              <span className={`tpl-ts tpl-right${(shift.variance ?? 0) < 0 ? " tpl-warn" : ""}`}>
                {shift.variance === null ? "—" : PESO.format(shift.variance)}
              </span>
              <span className="tpl-ts tpl-right">{PESO.format(shift.salesTotal)}</span>
              <span className="tpl-ts tpl-right">{shift.transactionCount}</span>
              <span className="tpl-ts">{statusLabel(shift.status)}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
