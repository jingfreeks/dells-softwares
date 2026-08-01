import type { PaymentType } from "@/lib";
import { LABEL_PAYMENT_CASH, LABEL_PAYMENT_QR, LABEL_PAYMENT_UTANG } from "@/lib";

interface PaymentMethodTabsProps {
  paymentType: PaymentType;
  onSelect: (type: PaymentType) => void;
}

export function PaymentMethodTabs({ paymentType, onSelect }: PaymentMethodTabsProps) {
  return (
    <div className="mt-3 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={() => onSelect("cash")}
        className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          paymentType === "cash" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {LABEL_PAYMENT_CASH}
      </button>
      <button
        type="button"
        onClick={() => onSelect("qr")}
        className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          paymentType === "qr" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {LABEL_PAYMENT_QR}
      </button>
      <button
        type="button"
        onClick={() => onSelect("credit")}
        className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          paymentType === "credit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
        }`}
      >
        {LABEL_PAYMENT_UTANG}
      </button>
    </div>
  );
}
