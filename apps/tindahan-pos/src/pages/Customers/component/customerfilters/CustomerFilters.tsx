import {
  PLACEHOLDER_SEARCH_CUSTOMERS,
  FILTER_OVERDUE_PREFIX,
  FILTER_HAS_UTANG,
  BUTTON_SORT_OLDEST_DEBT,
} from "@/lib";

interface CustomerFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  overdueOnly: boolean;
  onToggleOverdueOnly: () => void;
  overdueCount: number;
  hasUtangOnly: boolean;
  onToggleHasUtangOnly: () => void;
  sortByOldestDebt: boolean;
  onToggleSortByOldestDebt: () => void;
}

export function CustomerFilters({
  query,
  onQueryChange,
  overdueOnly,
  onToggleOverdueOnly,
  overdueCount,
  hasUtangOnly,
  onToggleHasUtangOnly,
  sortByOldestDebt,
  onToggleSortByOldestDebt,
}: CustomerFiltersProps) {
  return (
    <div className="tpl-row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
      <label className="tpl-fld" style={{ flex: 1, minWidth: 220 }}>
        <i className="ti ti-search" aria-hidden style={{ marginRight: 9, color: "var(--tpl-t6)" }} />
        <input
          type="text"
          aria-label={PLACEHOLDER_SEARCH_CUSTOMERS}
          placeholder={PLACEHOLDER_SEARCH_CUSTOMERS}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>

      <button
        type="button"
        aria-pressed={overdueOnly}
        onClick={onToggleOverdueOnly}
        className={`tpl-chip${overdueOnly ? " tpl-bad" : ""}`}
        style={{ cursor: "pointer", border: overdueOnly ? undefined : "0.5px solid rgba(255,255,255,.1)" }}
      >
        {FILTER_OVERDUE_PREFIX} · {overdueCount}
      </button>

      <button
        type="button"
        aria-pressed={hasUtangOnly}
        onClick={onToggleHasUtangOnly}
        className={`tpl-chip${hasUtangOnly ? " tpl-on" : ""}`}
        style={{ cursor: "pointer" }}
      >
        {FILTER_HAS_UTANG}
      </button>

      <button
        type="button"
        aria-pressed={sortByOldestDebt}
        onClick={onToggleSortByOldestDebt}
        className={`tpl-chip${sortByOldestDebt ? " tpl-on" : ""}`}
        style={{ cursor: "pointer" }}
      >
        <i className="ti ti-arrows-sort" aria-hidden />
        {BUTTON_SORT_OLDEST_DEBT}
      </button>
    </div>
  );
}
