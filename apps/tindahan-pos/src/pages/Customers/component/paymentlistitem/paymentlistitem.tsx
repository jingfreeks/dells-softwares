import type { CreditPayment } from "@/lib";
import {
  PESO,
  TEXT_RECORDED_BY_PREFIX, formatDate } from "@/lib";

const Paymentlistitem = (props: { payment: CreditPayment }) => {
    const { payment } = props;
  return (
    <div className="tpl-lr">
      <div className="tpl-flex1">
        <div className="tpl-sp">
          <span className="tabular-nums tpl-tp" style={{ fontWeight: 500 }}>
            {PESO.format(payment.amount)}
          </span>
          <span className="tpl-ts">
            {formatDate(payment.timestamp)}
          </span>
        </div>
        <p className="tpl-ts">
          {payment.note ? `${payment.note} · ` : ""}
          {TEXT_RECORDED_BY_PREFIX} {payment.createdByName}
        </p>
      </div>
    </div>
  );
};
export default Paymentlistitem;
