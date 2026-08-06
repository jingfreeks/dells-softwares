import type { Customer } from "@/lib";
import {
  COLUMN_CUSTOMER,
  COLUMN_BALANCE,
  COLUMN_CREDIT_USED,
  TEXT_NO_CUSTOMERS_MATCH_PREFIX,
  EMPTY_STATE_NO_CUSTOMERS,
} from "@/lib";
import { CustomerRow, CUSTOMER_ROW_COLUMNS } from "./customerrow";

interface CustomerTableProps {
  query: string;
  customers: Customer[];
  oldestDebtDaysById: Map<string, number | null>;
  selectedId: string | null;
  onSelect: (customer: Customer) => void;
}

export function CustomerTable({ query, customers, oldestDebtDaysById, selectedId, onSelect }: CustomerTableProps) {
  return (
    <div className="tpl-card" style={{ padding: 0 }}>
      <div className="tpl-thead" style={{ gridTemplateColumns: CUSTOMER_ROW_COLUMNS }}>
        <span>{COLUMN_CUSTOMER}</span>
        <span className="tpl-right">{COLUMN_BALANCE}</span>
        <span>{COLUMN_CREDIT_USED}</span>
        <span />
      </div>

      {customers.map((customer) => (
        <CustomerRow
          key={customer.id}
          customer={customer}
          oldestDebtDays={oldestDebtDaysById.get(customer.id) ?? null}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}

      {customers.length === 0 && (
        <p className="tpl-ts" style={{ padding: "32px 15px", textAlign: "center" }}>
          {query ? `${TEXT_NO_CUSTOMERS_MATCH_PREFIX} "${query}".` : EMPTY_STATE_NO_CUSTOMERS}
        </p>
      )}
    </div>
  );
}
