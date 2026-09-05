import { useRef } from "react";
import {
  PESO,
  HEADING_ON_SHIFT_NOW,
  ARIA_CLOSE_MODAL,
  COLUMN_CASHIER,
  LABEL_SINCE_PREFIX,
  COLUMN_OPENING_CASH,
  COLUMN_SALES,
  COLUMN_TRANSACTIONS,
  EMPTY_STATE_NO_ONE_ON_SHIFT,
  useEscapeToClose,
  useFocusTrap,
  formatDateTime,
} from "@/lib";
import type { OpenShift } from "../../hooksShifts";

interface OnShiftNowModalProps {
  openShifts: OpenShift[];
  onClose: () => void;
}

export function OnShiftNowModal({ openShifts, onClose }: OnShiftNowModalProps) {
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
        aria-labelledby="onShiftNowHeading"
        style={{ maxWidth: 720, overflowX: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 14 }}>
          <p id="onShiftNowHeading" className="tpl-h3">
            {HEADING_ON_SHIFT_NOW}
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

        {openShifts.length === 0 ? (
          <p className="tpl-ts">{EMPTY_STATE_NO_ONE_ON_SHIFT}</p>
        ) : (
          <div style={{ minWidth: 560 }}>
            <div className="tpl-thead" style={{ gridTemplateColumns: "minmax(0,1.2fr) 140px 90px 90px 100px" }}>
              <span>{COLUMN_CASHIER}</span>
              <span>{LABEL_SINCE_PREFIX}</span>
              <span className="tpl-right">{COLUMN_OPENING_CASH}</span>
              <span className="tpl-right">{COLUMN_SALES}</span>
              <span className="tpl-right">{COLUMN_TRANSACTIONS}</span>
            </div>

            {openShifts.map((shift) => (
              <div
                key={shift.id}
                className="tpl-trow"
                style={{ gridTemplateColumns: "minmax(0,1.2fr) 140px 90px 90px 100px", cursor: "default" }}
              >
                <span className="tpl-tp">{shift.staffName}</span>
                <span className="tpl-ts">{formatDateTime(shift.createdAt)}</span>
                <span className="tpl-ts tpl-right">{PESO.format(shift.openingFloat ?? 0)}</span>
                <span className="tpl-ts tpl-right">{PESO.format(shift.salesTotal)}</span>
                <span className="tpl-ts tpl-right">{shift.transactionCount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
