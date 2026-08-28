import type { Customer } from "../../../../../../../lib/types";

export interface CustomerResultRowProps {
  customer: Customer;
  onSelect: (customer: Customer) => void;
}
