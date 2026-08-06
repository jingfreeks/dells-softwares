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
} from "@/lib";
import { MOCK_SHIFT_HISTORY } from "./mockShiftHistory";

interface ShiftHistoryModalProps {
  onClose: () => void;
}

export function ShiftHistoryModal({ onClose }: ShiftHistoryModalProps) {
  return (
    <div className="tpl-modal-overlay" onClick={onClose}>
      <div
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shiftHistoryHeading"
        style={{ maxWidth: 720, overflowX: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
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

        <div style={{ minWidth: 640 }}>
          <div
            className="tpl-thead"
            style={{ gridTemplateColumns: "72px minmax(0,1.3fr) 80px 80px 80px 90px 90px minmax(0,1fr)" }}
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

          {MOCK_SHIFT_HISTORY.map((shift) => (
            <div
              key={shift.id}
              className="tpl-trow"
              style={{
                gridTemplateColumns: "72px minmax(0,1.3fr) 80px 80px 80px 90px 90px minmax(0,1fr)",
                cursor: "default",
              }}
            >
              <span className="tpl-ts">{shift.date}</span>
              <span className="tpl-tp">{shift.cashier}</span>
              <span className="tpl-ts tpl-right">{PESO.format(shift.opening)}</span>
              <span className="tpl-ts tpl-right">{PESO.format(shift.closing)}</span>
              <span className={`tpl-ts tpl-right${shift.variance < 0 ? " tpl-warn" : ""}`}>{PESO.format(shift.variance)}</span>
              <span className="tpl-ts tpl-right">{PESO.format(shift.sales)}</span>
              <span className="tpl-ts tpl-right">{shift.transactions}</span>
              <span className="tpl-ts">{shift.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
