import type { CreditPayment } from "@/lib";
import { LABEL_PAYMENT_HISTORY, LABEL_LOADING, EMPTY_STATE_NO_PAYMENTS } from "@/lib";
import { Paymentlistitem } from "./paymentlistitem";

interface PaymentHistoryCardProps {
  payments: CreditPayment[];
  loading: boolean;
}

export function PaymentHistoryCard({ payments, loading }: PaymentHistoryCardProps) {
  return (
    <div className="tpl-card">
      <p className="tpl-h3" style={{ marginBottom: 8 }}>{LABEL_PAYMENT_HISTORY}</p>
      {loading && <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>{LABEL_LOADING}</p>}
      {!loading &&
        payments.map((payment) => <Paymentlistitem key={payment.id} payment={payment} />)}
      {!loading && payments.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>{EMPTY_STATE_NO_PAYMENTS}</p>
      )}
    </div>
  );
}
