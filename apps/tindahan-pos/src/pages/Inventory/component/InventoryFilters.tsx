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
    <div className="flex flex-wrap gap-2" style={{ marginBottom: 14 }}>
      <label className="tpl-fld" style={{ flex: "1 1 280px", maxWidth: 440 }}>
        <i className="ti ti-search" aria-hidden style={{ marginRight: 9, color: "var(--tpl-t6)" }} />
        <input
          type="text"
          aria-label={PLACEHOLDER_SEARCH_INVENTORY}
          placeholder={PLACEHOLDER_SEARCH_INVENTORY}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>
      <select
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
        aria-label={LABEL_ALL_CATEGORIES}
        className="tpl-btn"
        style={{ width: "auto", height: 44, padding: "0 12px", marginBottom: 0 }}
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
