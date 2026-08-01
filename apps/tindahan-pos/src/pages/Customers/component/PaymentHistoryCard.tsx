import type { CreditPayment } from "@/lib";
import { PESO, LABEL_PAYMENT_HISTORY, LABEL_LOADING, EMPTY_STATE_NO_PAYMENTS, TEXT_RECORDED_BY_PREFIX } from "@/lib";

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
            <li key={payment.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="tabular-nums font-medium text-slate-900">{PESO.format(payment.amount)}</span>
                <span className="text-xs text-slate-500">
                  {new Date(payment.timestamp).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {payment.note ? `${payment.note} · ` : ""}
                {TEXT_RECORDED_BY_PREFIX} {payment.createdByName}
              </p>
            </li>
          ))}
        {!loading && payments.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">{EMPTY_STATE_NO_PAYMENTS}</li>
        )}
      </ul>
    </div>
  );
}
