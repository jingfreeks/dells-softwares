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
      <h2 className="text-sm font-semibold text-slate-900">{customer.name}</h2>
      <p className="text-xs text-slate-500">
        {customer.phone ?? EMPTY_STATE_NO_PHONE}
      </p>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
        <span className="text-xs font-medium text-slate-500">
          {LABEL_CURRENT_BALANCE}
        </span>
        <span className="tabular-nums text-xl font-bold tracking-tight text-slate-900">
          {PESO.format(customer.balance)}
        </span>
      </div>
    </>
  );
};
export default Headerscreen;
