import type { Customer } from "@/lib";
import {
  PLACEHOLDER_SEARCH_CUSTOMERS,
  TEXT_NO_CUSTOMERS_MATCH_PREFIX,
  EMPTY_STATE_NO_CUSTOMERS,
} from "@/lib";
import { Customerlistitem } from "./customerlistitem";
interface CustomerListCardProps {
  query: string;
  onQueryChange: (value: string) => void;
  filtered: Customer[];
  selectedId: string | null;
  onSelect: (customer: Customer) => void;
}

export function CustomerListCard({
  query,
  onQueryChange,
  filtered,
  selectedId,
  onSelect,
}: CustomerListCardProps) {
  return (
    <div className="tpl-card" style={{ padding: 0 }}>
      <div className="tpl-sp" style={{ padding: 14, borderBottom: "1px solid var(--tpl-b)" }}>
        <label className="tpl-fld" style={{ flex: 1 }}>
          <i className="ti ti-search" aria-hidden style={{ marginRight: 9, color: "var(--tpl-t6)" }} />
          <input
          type="text"
          aria-label={PLACEHOLDER_SEARCH_CUSTOMERS}
          placeholder={PLACEHOLDER_SEARCH_CUSTOMERS}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          />
        </label>
      </div>

      <ul className="divide-y divide-slate-100">
        {filtered.map((customer) => (
          <Customerlistitem
            key={customer.id}
            customer={customer}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">
            {query
              ? `${TEXT_NO_CUSTOMERS_MATCH_PREFIX} "${query}".`
              : EMPTY_STATE_NO_CUSTOMERS}
          </li>
        )}
      </ul>
    </div>
  );
}
