import type { Category } from "@/lib";
import {
  PLACEHOLDER_SEARCH_INVENTORY,
  LABEL_ALL_CATEGORIES,
  FILTER_NEEDS_ATTENTION_PREFIX,
  BUTTON_SORT_RUNS_OUT_SOONEST,
} from "@/lib";

interface InventoryFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: Category[];
  needsAttentionOnly: boolean;
  onToggleNeedsAttentionOnly: () => void;
  needsAttentionCount: number;
  sortByRunsOutSoonest: boolean;
  onToggleSortByRunsOutSoonest: () => void;
}

export function InventoryFilters({
  query,
  onQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  needsAttentionOnly,
  onToggleNeedsAttentionOnly,
  needsAttentionCount,
  sortByRunsOutSoonest,
  onToggleSortByRunsOutSoonest,
}: InventoryFiltersProps) {
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

      <button
        type="button"
        aria-pressed={needsAttentionOnly}
        onClick={onToggleNeedsAttentionOnly}
        className={`tpl-chip${needsAttentionOnly ? " tpl-w" : ""}`}
        style={{ cursor: "pointer", height: 44, padding: "0 14px" }}
      >
        {FILTER_NEEDS_ATTENTION_PREFIX} · {needsAttentionCount}
      </button>

      <button
        type="button"
        aria-pressed={sortByRunsOutSoonest}
        onClick={onToggleSortByRunsOutSoonest}
        className={`tpl-chip${sortByRunsOutSoonest ? " tpl-on" : ""}`}
        style={{ cursor: "pointer", height: 44, padding: "0 14px" }}
      >
        <i className="ti ti-arrows-sort" aria-hidden />
        {BUTTON_SORT_RUNS_OUT_SOONEST}
      </button>
    </div>
  );
}
