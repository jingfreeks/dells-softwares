import { useEffect } from "react";
import { Modal, Receipt, type ReceiptDisplaySettings } from "@/components";
import { BUTTON_NEW_SALE, printGuardrails, type SaleRecord, type Store } from "@/lib";

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

  if (!sale || !store) return null;

  return (
    <Modal open={open} onClose={onClose} label={BUTTON_NEW_SALE} maxWidth={380}>
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
          {printGuardrails().printActionLabel}
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
    </Modal>
  );
}
