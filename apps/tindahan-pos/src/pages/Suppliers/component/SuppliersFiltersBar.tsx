import type { Category } from "@/lib";
import {
  PLACEHOLDER_SEARCH_SUPPLIER,
  LABEL_ALL_CATEGORIES,
  FILTER_OWING_PREFIX,
  SORT_MOST_SPENT,
  SORT_RECENTLY_DELIVERED,
  SORT_NAME,
} from "@/lib";
import type { SupplierSort } from "../hooks";

interface SuppliersFiltersBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  categories: Category[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  owingOnly: boolean;
  onOwingOnlyChange: (value: boolean) => void;
  owingCount: number;
  sort: SupplierSort;
  onSortChange: (value: SupplierSort) => void;
}

export function SuppliersFiltersBar({
  query,
  onQueryChange,
  categories,
  categoryFilter,
  onCategoryFilterChange,
  owingOnly,
  onOwingOnlyChange,
  owingCount,
  sort,
  onSortChange,
}: SuppliersFiltersBarProps) {
  return (
    <div className="tpl-sp" style={{ gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <div className="tpl-fld" style={{ flex: 1, minWidth: 200 }}>
        <input
          type="text"
          placeholder={PLACEHOLDER_SEARCH_SUPPLIER}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <div className="tpl-fld" style={{ width: "auto", minWidth: 160 }}>
        <select value={categoryFilter} onChange={(e) => onCategoryFilterChange(e.target.value)}>
          <option value="All">{LABEL_ALL_CATEGORIES}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <span
        role="button"
        tabIndex={0}
        className={`tpl-chip${owingOnly ? " tpl-w" : ""}`}
        style={{ cursor: "pointer", height: 38, display: "inline-flex", alignItems: "center" }}
        onClick={() => onOwingOnlyChange(!owingOnly)}
        onKeyDown={(e) => e.key === "Enter" && onOwingOnlyChange(!owingOnly)}
      >
        {FILTER_OWING_PREFIX} · {owingCount}
      </span>
      <div className="tpl-fld" style={{ width: "auto", minWidth: 160 }}>
        <select value={sort} onChange={(e) => onSortChange(e.target.value as SupplierSort)}>
          <option value="most_spent">{SORT_MOST_SPENT}</option>
          <option value="recently_delivered">{SORT_RECENTLY_DELIVERED}</option>
          <option value="name">{SORT_NAME}</option>
        </select>
      </div>
    </div>
  );
}
