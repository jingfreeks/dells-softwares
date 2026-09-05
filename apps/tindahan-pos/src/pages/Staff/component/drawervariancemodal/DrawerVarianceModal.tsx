import {
  PESO,
  HEADING_DRAWER_VARIANCE,
  ARIA_CLOSE_MODAL,
  COLUMN_SHIFT_DATE,
  COLUMN_CASHIER,
  COLUMN_EXPECTED,
  COLUMN_ACTUAL,
  COLUMN_VARIANCE,
  EMPTY_STATE_NO_VARIANCE_THIS_WEEK,
  TEXT_VARIANCE_SCOPE_NOTE,
  useEscapeToClose,
  useFocusTrap,
  formatDateTime,
} from "@/lib";
import { useRef } from "react";
import type { ClosedShift } from "../../lib";

interface DrawerVarianceModalProps {
  closedShifts: ClosedShift[];
  onClose: () => void;
}

export function DrawerVarianceModal({ closedShifts, onClose }: DrawerVarianceModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(true, onClose);
  useFocusTrap(true, dialogRef);

  return (
    <div className="tpl-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawerVarianceHeading"
        style={{ maxWidth: 720, overflowX: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 14 }}>
          <p id="drawerVarianceHeading" className="tpl-h3">
            {HEADING_DRAWER_VARIANCE}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={ARIA_CLOSE_MODAL}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tpl-t7)", fontSize: 18, padding: 4 }}
          >
            <i className="ti ti-x" aria-hidden />
          </button>
        </div>

        {closedShifts.length === 0 ? (
          <p className="tpl-ts">{EMPTY_STATE_NO_VARIANCE_THIS_WEEK}</p>
        ) : (
          <div style={{ minWidth: 560 }}>
            <div className="tpl-thead" style={{ gridTemplateColumns: "110px minmax(0,1fr) 90px 90px 90px" }}>
              <span>{COLUMN_SHIFT_DATE}</span>
              <span>{COLUMN_CASHIER}</span>
              <span className="tpl-right">{COLUMN_EXPECTED}</span>
              <span className="tpl-right">{COLUMN_ACTUAL}</span>
              <span className="tpl-right">{COLUMN_VARIANCE}</span>
            </div>

            {closedShifts.map((shift) => (
              <div
                key={shift.id}
                className="tpl-trow"
                style={{ gridTemplateColumns: "110px minmax(0,1fr) 90px 90px 90px", cursor: "default" }}
              >
                <span className="tpl-ts">{formatDateTime(shift.revokedAt)}</span>
                <span className="tpl-tp">{shift.staffName}</span>
                <span className="tpl-ts tpl-right">{PESO.format(shift.expectedClosing ?? 0)}</span>
                <span className="tpl-ts tpl-right">{PESO.format(shift.closingFloat ?? 0)}</span>
                <span className={`tpl-ts tpl-right${shift.variance < 0 ? " tpl-warn" : ""}`}>
                  {PESO.format(shift.variance)}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="tpl-ts" style={{ marginTop: 14 }}>
          {TEXT_VARIANCE_SCOPE_NOTE}
        </p>
      </div>
    </div>
  );
}
