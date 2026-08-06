import { TEXT_SHOWING_PREFIX, TEXT_OF, BUTTON_PREVIOUS, BUTTON_NEXT, TEXT_PAGE_PREFIX } from "@/lib";
import { PAGE_SIZE } from "../hooks";

interface InventoryPaginationProps {
  visible: boolean;
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  onPageChange: (page: number) => void;
}

export function InventoryPagination({ visible, currentPage, totalPages, filteredCount, onPageChange }: InventoryPaginationProps) {
  if (!visible) return null;

  return (
    <div className="tpl-sp" style={{ marginTop: 12 }}>
      <p className="tpl-ts">
        {TEXT_SHOWING_PREFIX} {(currentPage - 1) * PAGE_SIZE + 1}–
        {Math.min(currentPage * PAGE_SIZE, filteredCount)} {TEXT_OF} {filteredCount}
      </p>
      <div className="tpl-row" style={{ gap: 6 }}>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="tpl-chip"
          style={{ cursor: currentPage <= 1 ? "not-allowed" : "pointer", opacity: currentPage <= 1 ? 0.4 : 1 }}
        >
          {BUTTON_PREVIOUS}
        </button>
        <p className="tpl-ts">
          {TEXT_PAGE_PREFIX} {currentPage} {TEXT_OF} {totalPages}
        </p>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="tpl-chip"
          style={{ cursor: currentPage >= totalPages ? "not-allowed" : "pointer", opacity: currentPage >= totalPages ? 0.4 : 1 }}
        >
          {BUTTON_NEXT}
        </button>
      </div>
    </div>
  );
}
