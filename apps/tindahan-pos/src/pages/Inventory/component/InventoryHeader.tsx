import { Link } from "react-router-dom";
import { NAV_LABEL_INVENTORY, PAGE_HEADING_RECEIVING, TEXT_PRODUCTS_TRACKED_SUFFIX, LABEL_VERSION_1_1, BUTTON_CATEGORIES, BUTTON_ADD_PRODUCT } from "@/lib";
import { TruckIcon } from "@/components";

interface InventoryHeaderProps {
  productCount: number;
  onOpenCategoryManager: () => void;
  onAddProduct: () => void;
}

export function InventoryHeader({ productCount, onOpenCategoryManager, onAddProduct }: InventoryHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{NAV_LABEL_INVENTORY}</h1>
        <p className="text-sm text-slate-500">
          {productCount} {TEXT_PRODUCTS_TRACKED_SUFFIX}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/inventory/receiving"
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <TruckIcon className="h-4 w-4" />
          {PAGE_HEADING_RECEIVING}
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            {LABEL_VERSION_1_1}
          </span>
        </Link>
        <button
          type="button"
          onClick={onOpenCategoryManager}
          className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {BUTTON_CATEGORIES}
        </button>
        <button
          type="button"
          onClick={onAddProduct}
          className="cursor-pointer rounded-xl bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-brand-dark)]"
        >
          {BUTTON_ADD_PRODUCT}
        </button>
      </div>
    </div>
  );
}
