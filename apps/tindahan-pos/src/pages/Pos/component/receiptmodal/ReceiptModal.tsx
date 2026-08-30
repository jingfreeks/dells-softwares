import { useEffect, useRef } from "react";
import { Receipt, type ReceiptDisplaySettings } from "@/components";
import { BUTTON_PRINT_RECEIPT, BUTTON_NEW_SALE, useEscapeToClose, useFocusTrap, type SaleRecord, type Store } from "@/lib";

interface ReceiptModalProps {
  open: boolean;
  sale: SaleRecord | null;
  store: Store | null;
  settings: ReceiptDisplaySettings;
  tin?: string;
  businessPermitNo?: string;
  tendered?: number;
  change?: number;
  autoPrint: boolean;
  onClose: () => void;
  /** True when reprinting a past sale rather than showing the receipt right
   * after checkout -- shows an explicit on-screen marker on the receipt. */
  isReprint?: boolean;
  /** Defaults to "New sale", the label that fits the post-checkout flow this
   * modal was built for -- a reprint from Reports overrides it to "Close". */
  closeLabel?: string;
}

export function ReceiptModal({
  open,
  sale,
  store,
  settings,
  tin,
  businessPermitNo,
  tendered,
  change,
  autoPrint,
  onClose,
  isReprint,
  closeLabel = BUTTON_NEW_SALE,
}: ReceiptModalProps) {
  useEffect(() => {
    if (open && autoPrint) {
      window.print();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useEscapeToClose(open, onClose);
  useFocusTrap(open, dialogRef);

  if (!open || !sale || !store) return null;

  return (
    <div className="tpl-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="tpl-modal-panel tpl-card"
        style={{ maxWidth: 380 }}
        role="dialog"
        aria-modal="true"
        aria-label={BUTTON_NEW_SALE}
        onClick={(e) => e.stopPropagation()}
      >
        <Receipt
          sale={sale}
          store={store}
          settings={settings}
          tin={tin}
          businessPermitNo={businessPermitNo}
          tendered={tendered}
          change={change}
          isReprint={isReprint}
        />

        <div className="tpl-row" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="tpl-btn"
            style={{ flex: 1, marginBottom: 0, justifyContent: "center", height: 40 }}
            onClick={() => window.print()}
          >
            {BUTTON_PRINT_RECEIPT}
          </button>
          <button
            type="button"
            className="tpl-btnp"
            style={{ flex: 1, marginBottom: 0, justifyContent: "center", height: 40 }}
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
