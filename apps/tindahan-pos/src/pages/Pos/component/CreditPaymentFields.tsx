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
    <div style={{ marginTop: 14 }}>
      {selectedCustomer ? (
        <>
          <div className="tpl-sp tpl-card">
            <div>
              <p className="tpl-tp">{selectedCustomer.name}</p>
              <p className="tpl-ts" style={{ margin: 0 }}>
                {LABEL_CURRENT_BALANCE}: {PESO.format(selectedCustomer.balance)}
                {selectedCustomer.creditLimit !== null &&
                  ` ${TEXT_LIMIT_PREFIX} ${PESO.format(selectedCustomer.creditLimit)}`}
              </p>
            </div>
            <button type="button" onClick={onClearCustomer} className="tpl-lnk">
              {BUTTON_CHANGE}
            </button>
          </div>
          {wouldExceedCreditLimit(selectedCustomer, total) && (
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--tpl-warn)" }}>
              This sale would put {selectedCustomer.name} {TEXT_CREDIT_LIMIT_WARNING_MIDDLE}{" "}
              {PESO.format(selectedCustomer.creditLimit ?? 0)} {TEXT_CREDIT_LIMIT_WARNING_SUFFIX}
            </p>
          )}
        </>
      ) : (
        <>
          <label htmlFor="customerSearch" className="tpl-lbl">
            {LABEL_CHARGE_TO_CUSTOMER}
          </label>
          <div className="tpl-fld">
            <input
              id="customerSearch"
              type="text"
              placeholder={PLACEHOLDER_SEARCH_BY_NAME}
              value={customerQuery}
              onChange={(e) => onCustomerQueryChange(e.target.value)}
            />
          </div>
          {customerResults.length > 0 && (
            <div className="tpl-card" style={{ marginTop: 8, padding: 4 }}>
              {customerResults.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => onSelectCustomer(customer.id)}
                  className="tpl-lr"
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <span className="tpl-tp">{customer.name}</span>
                  <span className="tpl-ts">{PESO.format(customer.balance)}</span>
                </button>
              ))}
            </div>
          )}
          {customerQuery.trim() !== "" && customerResults.length === 0 && (
            <button type="button" onClick={onQuickAddCustomer} disabled={addingCustomer} className="tpl-btn" style={{ marginTop: 8 }}>
              {addingCustomer
                ? BUTTON_ADDING
                : `${TEXT_ADD_AS_NEW_CUSTOMER_PREFIX} "${customerQuery.trim()}" ${TEXT_ADD_AS_NEW_CUSTOMER_SUFFIX}`}
            </button>
          )}
          {customerError && (
            <p role="alert" style={{ marginTop: 8, fontSize: 13, color: "var(--tpl-bad)" }}>
              {customerError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
