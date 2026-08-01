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
    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
      <span>
        {TEXT_SHOWING_PREFIX} {(currentPage - 1) * PAGE_SIZE + 1}–
        {Math.min(currentPage * PAGE_SIZE, filteredCount)} {TEXT_OF} {filteredCount}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {BUTTON_PREVIOUS}
        </button>
        <span>
          {TEXT_PAGE_PREFIX} {currentPage} {TEXT_OF} {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="cursor-pointer rounded-xl border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {BUTTON_NEXT}
        </button>
      </div>
    </div>
  );
}
