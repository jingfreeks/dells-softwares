import type { Category } from "@/lib";
import { PLACEHOLDER_SEARCH_INVENTORY, LABEL_ALL_CATEGORIES } from "@/lib";

interface InventoryFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: Category[];
}

export function InventoryFilters({ query, onQueryChange, categoryFilter, onCategoryFilterChange, categories }: InventoryFiltersProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <input
        type="text"
        placeholder={PLACEHOLDER_SEARCH_INVENTORY}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
      />
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
      >
        <option value="All">{LABEL_ALL_CATEGORIES}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
