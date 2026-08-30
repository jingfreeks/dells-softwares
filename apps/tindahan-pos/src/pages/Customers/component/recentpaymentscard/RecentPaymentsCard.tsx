import { PESO, HEADING_RECENT_PAYMENTS, LINK_VIEW_ALL, EMPTY_STATE_NO_RECENT_PAYMENTS } from "@/lib";
import { useRecentPaymentsCard } from "./useRecentPaymentsCard";

const STATUS_LABEL = { settled: "settled", partial: "partial" } as const;

export function RecentPaymentsCard() {
  const { payments, loading, formatPaymentDate } = useRecentPaymentsCard();

  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{HEADING_RECENT_PAYMENTS}</p>
        <span className="tpl-lnk">{LINK_VIEW_ALL}</span>
      </div>

      {payments.map((payment) => (
        <div key={payment.id} className="tpl-lr">
          <span className="tpl-ic tpl-g" style={{ borderRadius: "50%" }}>
            <i className="ti ti-arrow-down-circle" aria-hidden />
          </span>
          <div className="tpl-flex1">
            <p className="tpl-tp">{payment.customerName}</p>
            <p className="tpl-ts">
              {formatPaymentDate(payment.timestamp)}
              {payment.status ? ` · ${STATUS_LABEL[payment.status]}` : ""}
            </p>
          </div>
          <span className="tpl-ok" style={{ fontSize: 13 }}>
            {PESO.format(payment.amount)}
          </span>
        </div>
      ))}

      {!loading && payments.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_RECENT_PAYMENTS}
        </p>
      )}
    </div>
  );
}
