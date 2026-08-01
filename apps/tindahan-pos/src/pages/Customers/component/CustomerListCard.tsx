import type { Customer } from "@/lib";
import { PESO, PLACEHOLDER_SEARCH_CUSTOMERS, BUTTON_ADD_CUSTOMER, TEXT_NO_CUSTOMERS_MATCH_PREFIX, EMPTY_STATE_NO_CUSTOMERS, EMPTY_STATE_NO_PHONE } from "@/lib";

interface CustomerListCardProps {
  query: string;
  onQueryChange: (value: string) => void;
  onAdd: () => void;
  filtered: Customer[];
  selectedId: string | null;
  onSelect: (customer: Customer) => void;
}

export function CustomerListCard({ query, onQueryChange, onAdd, filtered, selectedId, onSelect }: CustomerListCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4">
        <input
          type="text"
          placeholder={PLACEHOLDER_SEARCH_CUSTOMERS}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        />
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 cursor-pointer rounded-xl bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
        >
          {BUTTON_ADD_CUSTOMER}
        </button>
      </div>
      <ul className="divide-y divide-slate-100">
        {filtered.map((customer) => (
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
                <p className="text-xs text-slate-500">{customer.phone ?? EMPTY_STATE_NO_PHONE}</p>
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
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">
            {query ? `${TEXT_NO_CUSTOMERS_MATCH_PREFIX} "${query}".` : EMPTY_STATE_NO_CUSTOMERS}
          </li>
        )}
      </ul>
    </div>
  );
}
