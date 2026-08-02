import type { PaymentType } from "@/lib";
import { LABEL_PAYMENT_CASH, LABEL_PAYMENT_QR, LABEL_PAYMENT_UTANG } from "@/lib";

interface PaymentMethodTabsProps {
  paymentType: PaymentType;
  onSelect: (type: PaymentType) => void;
}

export function PaymentMethodTabs({ paymentType, onSelect }: PaymentMethodTabsProps) {
  return (
    <div className="tpl-seg" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
      <button type="button" onClick={() => onSelect("cash")} className={paymentType === "cash" ? "tpl-on" : ""}>
        {LABEL_PAYMENT_CASH}
      </button>
      <button type="button" onClick={() => onSelect("qr")} className={paymentType === "qr" ? "tpl-on" : ""}>
        {LABEL_PAYMENT_QR}
      </button>
      <button
        type="button"
        onClick={() => onSelect("credit")}
        className={paymentType === "credit" ? "tpl-on" : ""}
      >
        {LABEL_PAYMENT_UTANG}
      </button>
    </div>
  );
}
