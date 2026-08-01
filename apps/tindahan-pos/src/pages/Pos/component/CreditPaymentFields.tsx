import type { Customer } from "@/lib";
import {
  PESO,
  wouldExceedCreditLimit,
  LABEL_CURRENT_BALANCE,
  TEXT_LIMIT_PREFIX,
  BUTTON_CHANGE,
  TEXT_CREDIT_LIMIT_WARNING_MIDDLE,
  TEXT_CREDIT_LIMIT_WARNING_SUFFIX,
  LABEL_CHARGE_TO_CUSTOMER,
  PLACEHOLDER_SEARCH_BY_NAME,
  BUTTON_ADDING,
  TEXT_ADD_AS_NEW_CUSTOMER_PREFIX,
  TEXT_ADD_AS_NEW_CUSTOMER_SUFFIX,
} from "@/lib";

interface CreditPaymentFieldsProps {
  total: number;
  selectedCustomer: Customer | null;
  onClearCustomer: () => void;
  customerQuery: string;
  onCustomerQueryChange: (value: string) => void;
  customerResults: Customer[];
  onSelectCustomer: (id: string) => void;
  addingCustomer: boolean;
  onQuickAddCustomer: () => void;
  customerError: string | null;
}

export function CreditPaymentFields({
  total,
  selectedCustomer,
  onClearCustomer,
  customerQuery,
  onCustomerQueryChange,
  customerResults,
  onSelectCustomer,
  addingCustomer,
  onQuickAddCustomer,
  customerError,
}: CreditPaymentFieldsProps) {
  return (
    <div className="mt-3">
      {selectedCustomer ? (
        <>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-slate-800">{selectedCustomer.name}</p>
              <p className="text-xs text-slate-500">
                {LABEL_CURRENT_BALANCE}: {PESO.format(selectedCustomer.balance)}
                {selectedCustomer.creditLimit !== null &&
                  ` ${TEXT_LIMIT_PREFIX} ${PESO.format(selectedCustomer.creditLimit)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearCustomer}
              className="cursor-pointer text-xs font-medium text-[var(--color-brand)] hover:underline"
            >
              {BUTTON_CHANGE}
            </button>
          </div>
          {wouldExceedCreditLimit(selectedCustomer, total) && (
            <p className="mt-2 text-xs text-amber-600">
              This sale would put {selectedCustomer.name} {TEXT_CREDIT_LIMIT_WARNING_MIDDLE}{" "}
              {PESO.format(selectedCustomer.creditLimit ?? 0)} {TEXT_CREDIT_LIMIT_WARNING_SUFFIX}
            </p>
          )}
        </>
      ) : (
        <>
          <label htmlFor="customerSearch" className="text-xs font-medium text-slate-700">
            {LABEL_CHARGE_TO_CUSTOMER}
          </label>
          <input
            id="customerSearch"
            type="text"
            placeholder={PLACEHOLDER_SEARCH_BY_NAME}
            value={customerQuery}
            onChange={(e) => onCustomerQueryChange(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
          {customerResults.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
              {customerResults.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(customer.id)}
                    className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span>{customer.name}</span>
                    <span className="tabular-nums text-xs text-slate-500">{PESO.format(customer.balance)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {customerQuery.trim() !== "" && customerResults.length === 0 && (
            <button
              type="button"
              onClick={onQuickAddCustomer}
              disabled={addingCustomer}
              className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingCustomer
                ? BUTTON_ADDING
                : `${TEXT_ADD_AS_NEW_CUSTOMER_PREFIX} "${customerQuery.trim()}" ${TEXT_ADD_AS_NEW_CUSTOMER_SUFFIX}`}
            </button>
          )}
          {customerError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {customerError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
