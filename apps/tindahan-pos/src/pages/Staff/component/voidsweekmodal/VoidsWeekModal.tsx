import {
  PESO,
  HEADING_VOIDS_THIS_WEEK,
  ARIA_CLOSE_MODAL,
  COLUMN_SHIFT_DATE,
  COLUMN_CASHIER,
  COLUMN_RECEIPT,
  COLUMN_AMOUNT,
  COLUMN_REASON,
  EMPTY_STATE_NO_VOIDS_THIS_WEEK,
  useEscapeToClose,
  type SaleRecord,
} from "@/lib";

interface VoidsWeekModalProps {
  voidedSales: SaleRecord[];
  onClose: () => void;
}

export function VoidsWeekModal({ voidedSales, onClose }: VoidsWeekModalProps) {
  useEscapeToClose(true, onClose);

  return (
    <div className="tpl-modal-overlay" onClick={onClose}>
      <div
        className="tpl-modal-panel tpl-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voidsWeekHeading"
        style={{ maxWidth: 720, overflowX: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tpl-sp" style={{ marginBottom: 14 }}>
          <p id="voidsWeekHeading" className="tpl-h3">
            {HEADING_VOIDS_THIS_WEEK}
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

        {voidedSales.length === 0 ? (
          <p className="tpl-ts">{EMPTY_STATE_NO_VOIDS_THIS_WEEK}</p>
        ) : (
          <div style={{ minWidth: 560 }}>
            <div className="tpl-thead" style={{ gridTemplateColumns: "110px minmax(0,1fr) 100px 90px minmax(0,1.4fr)" }}>
              <span>{COLUMN_SHIFT_DATE}</span>
              <span>{COLUMN_CASHIER}</span>
              <span>{COLUMN_RECEIPT}</span>
              <span className="tpl-right">{COLUMN_AMOUNT}</span>
              <span>{COLUMN_REASON}</span>
            </div>

            {voidedSales.map((sale) => (
              <div
                key={sale.id}
                className="tpl-trow"
                style={{ gridTemplateColumns: "110px minmax(0,1fr) 100px 90px minmax(0,1.4fr)", cursor: "default" }}
              >
                <span className="tpl-ts">{new Date(sale.voidedAt ?? sale.timestamp).toLocaleString()}</span>
                <span className="tpl-tp">{sale.cashierName}</span>
                <span className="tpl-ts">{sale.receiptNumber ?? "—"}</span>
                <span className="tpl-ts tpl-right">{PESO.format(sale.total)}</span>
                <span className="tpl-ts">{sale.voidReason ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
