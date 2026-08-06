import type { Customer } from "@/lib";
import {
  PESO,
  EMPTY_STATE_NO_PHONE,
  LABEL_CURRENT_BALANCE,
} from "@/lib";

const Headerscreen = (props: { customer: Customer }) => {
    const { customer } = props;
  return (
    <>
      <p className="tpl-h3">{customer.name}</p>
      <p className="tpl-ts" style={{ marginTop: 2 }}>
        {customer.phone ?? EMPTY_STATE_NO_PHONE}
      </p>
      <div
        className="tpl-sp"
        style={{
          marginTop: 12,
          background: "var(--tpl-gl)",
          border: "0.5px solid var(--tpl-bd)",
          borderRadius: 10,
          padding: "10px 12px",
        }}
      >
        <span className="tpl-ts" style={{ fontWeight: 500 }}>
          {LABEL_CURRENT_BALANCE}
        </span>
        <span className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color: "var(--tpl-t1)" }}>
          {PESO.format(customer.balance)}
        </span>
      </div>
    </>
  );
};
export default Headerscreen;
