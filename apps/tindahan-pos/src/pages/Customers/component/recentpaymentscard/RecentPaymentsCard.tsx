import { PESO, HEADING_RECENT_PAYMENTS, LINK_VIEW_ALL, EMPTY_STATE_NO_RECENT_PAYMENTS } from "@/lib";
import { MOCK_RECENT_PAYMENTS } from "./mockRecentPayments";

export function RecentPaymentsCard() {
  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{HEADING_RECENT_PAYMENTS}</p>
        <span className="tpl-lnk">{LINK_VIEW_ALL}</span>
      </div>

      {MOCK_RECENT_PAYMENTS.map((payment) => (
        <div key={payment.id} className="tpl-lr">
          <span className="tpl-ic tpl-g" style={{ borderRadius: "50%" }}>
            <i className="ti ti-arrow-down-circle" aria-hidden />
          </span>
          <div className="tpl-flex1">
            <p className="tpl-tp">{payment.customerName}</p>
            <p className="tpl-ts">
              {payment.whenLabel} · {payment.method} · {payment.status}
            </p>
          </div>
          <span className="tpl-ok" style={{ fontSize: 13 }}>
            {PESO.format(payment.amount)}
          </span>
        </div>
      ))}

      {MOCK_RECENT_PAYMENTS.length === 0 && (
        <p className="tpl-ts" style={{ padding: "16px 0", textAlign: "center" }}>
          {EMPTY_STATE_NO_RECENT_PAYMENTS}
        </p>
      )}
    </div>
  );
}
