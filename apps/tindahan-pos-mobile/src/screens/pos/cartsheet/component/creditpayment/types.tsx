import type { Customer } from "../../../../../lib/types";

export interface CreditPaymentProps {
  customerQuery: string;
  onCustomerQueryChange: (value: string) => void;
  customerResults: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  onClearCustomer: () => void;
  creditWarning: string | null;
}
