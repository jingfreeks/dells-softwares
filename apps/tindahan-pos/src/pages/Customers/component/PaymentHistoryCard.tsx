import type { CreditPayment } from "@/lib";
import { LABEL_PAYMENT_HISTORY, LABEL_LOADING, EMPTY_STATE_NO_PAYMENTS } from "@/lib";
import { Paymentlistitem } from "./paymentlistitem";

interface PaymentHistoryCardProps {
  payments: CreditPayment[];
  loading: boolean;
}

export function PaymentHistoryCard({ payments, loading }: PaymentHistoryCardProps) {
  return (
    <div className="card">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">{LABEL_PAYMENT_HISTORY}</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {loading && <li className="px-4 py-8 text-center text-sm text-slate-400">{LABEL_LOADING}</li>}
        {!loading &&
          payments.map((payment) => (
            <Paymentlistitem payment={payment} />
          ))}
        {!loading && payments.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_NO_PAYMENTS}</li>
        )}
      </ul>
    </div>
  );
}
