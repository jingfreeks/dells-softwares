import type { Customer } from "@/lib";
import { PESO, EMPTY_STATE_NO_PHONE } from "@/lib";

const Customerlistitem = (props: {
  customer: Customer;
  onSelect: (customer: Customer) => void;
  selectedId: string | null;
}) => {
  const { customer, onSelect, selectedId } = props;
  return (
    <li key={customer.id}>
      <button
        type="button"
        onClick={() => onSelect(customer)}
        className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 ${
          selectedId === customer.id ? "bg-[var(--color-brand)]/5" : ""
        }`}
      >
        <div>
          <p className="font-medium text-slate-800">{customer.name}</p>
          <p className="text-xs text-slate-500">
            {customer.phone ?? EMPTY_STATE_NO_PHONE}
          </p>
        </div>
        <span
          className={`tabular-nums text-sm font-semibold ${
            customer.balance > 0 ? "text-amber-600" : "text-slate-400"
          }`}
        >
          {PESO.format(customer.balance)}
        </span>
      </button>
    </li>
  );
};
export default Customerlistitem;
