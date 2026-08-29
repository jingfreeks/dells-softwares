import type { KeyboardEvent } from "react";
import type { Customer } from "@/lib";
import { PESO, TEXT_OLDEST_DEBT_PREFIX, TEXT_DAYS_SUFFIX, TEXT_PAID_IN_FULL, creditUsageVariant, isOverdueDebt } from "@/lib";
import { CreditProgress } from "../../creditprogress";
import { CustomerActions } from "../../customeractions";
import { customerInitials } from "../../../lib";

// Same collapse bug as the Inventory table's PRODUCT_ROW_COLUMNS: the two
// fixed columns (balance/actions) plus gaps already take up ~200px, and on
// a narrow viewport minmax(0, ...) let the two flexible columns collapse
// straight to a few px -- customer name, balance, credit-used and the
// Collect button all rendered stacked on the same point. The floors below
// stop that; CustomerTable's own overflow-x:auto lets the row scroll
// sideways past this width instead.
export const CUSTOMER_ROW_COLUMNS = "minmax(140px,2fr) 96px minmax(120px,1.4fr) 86px";

interface CustomerRowProps {
  customer: Customer;
  oldestDebtDays: number | null;
  thresholdDays: number;
  selectedId: string | null;
  onSelect: (customer: Customer) => void;
}

export function CustomerRow({ customer, oldestDebtDays, thresholdDays, selectedId, onSelect }: CustomerRowProps) {
  const overdue = isOverdueDebt(oldestDebtDays, thresholdDays);
  const variant = creditUsageVariant(customer, oldestDebtDays, thresholdDays);
  const avatarVariant = customer.balance <= 0 ? "tpl-g" : overdue ? "tpl-r" : "tpl-b";

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(customer);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(customer)}
      onKeyDown={handleKeyDown}
      className={`tpl-trow${selectedId === customer.id ? " tpl-on" : variant === "danger" ? " tpl-r" : ""}`}
      style={{ gridTemplateColumns: CUSTOMER_ROW_COLUMNS }}
    >
      <div className="tpl-row">
        <span className={`tpl-av ${avatarVariant}`} style={{ width: 30, height: 30, fontSize: 12 }}>
          {customerInitials(customer.name)}
        </span>
        <div className="tpl-flex1">
          <p className="tpl-tp">{customer.name}</p>
          <p className={`tpl-ts${overdue ? " tpl-bad" : customer.balance <= 0 ? " tpl-ok" : ""}`}>
            {customer.balance > 0
              ? `${TEXT_OLDEST_DEBT_PREFIX} ${oldestDebtDays ?? 0} ${TEXT_DAYS_SUFFIX}`
              : TEXT_PAID_IN_FULL}
          </p>
        </div>
      </div>

      <div className="tpl-right">
        <p className="tpl-tp" style={{ fontWeight: 500, color: overdue ? "var(--tpl-bad)" : undefined }}>
          {PESO.format(customer.balance)}
        </p>
      </div>

      <CreditProgress used={customer.balance} limit={customer.creditLimit} variant={variant} />

      <CustomerActions hasBalance={customer.balance > 0} onClick={() => onSelect(customer)} />
    </div>
  );
}
