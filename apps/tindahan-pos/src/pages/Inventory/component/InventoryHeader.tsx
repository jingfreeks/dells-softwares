import { Link } from "react-router-dom";
import { NAV_LABEL_INVENTORY, TEXT_PRODUCTS_TRACKED_SUFFIX, PAGE_HEADING_RECEIVING, LABEL_VERSION_1_1, TEXT_LAST_STOCK_IN_PREFIX, BUTTON_CATEGORIES, BUTTON_ADD_PRODUCT } from "@/lib";
import { TruckIcon } from "@/components";

interface InventoryHeaderProps {
  productCount: number;
  lastStockIn: string | null;
  onOpenCategoryManager: () => void;
  onAddProduct: () => void;
}

export function InventoryHeader({ productCount, lastStockIn, onOpenCategoryManager, onAddProduct }: InventoryHeaderProps) {
  return (
    <div className="tpl-hd">
      <div>
        <h1 className="tpl-h1">{NAV_LABEL_INVENTORY}</h1>
        <p className="tpl-sub">
          {productCount} {TEXT_PRODUCTS_TRACKED_SUFFIX}
          {lastStockIn && ` · ${TEXT_LAST_STOCK_IN_PREFIX} ${lastStockIn}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          to="/inventory/receiving"
          className="tpl-btn"
          style={{ width: "auto", height: 36, padding: "0 12px", fontSize: 13, marginBottom: 0 }}
        >
          <TruckIcon className="h-4 w-4" />
          {PAGE_HEADING_RECEIVING}
          <span className="tpl-chip" style={{ fontSize: 10, padding: "1px 6px" }}>{LABEL_VERSION_1_1}</span>
        </Link>
        <button
          type="button"
          onClick={onOpenCategoryManager}
          className="tpl-btn"
          style={{ width: "auto", height: 36, padding: "0 12px", fontSize: 13, marginBottom: 0 }}
        >
          {BUTTON_CATEGORIES}
        </button>
        <button
          type="button"
          onClick={onAddProduct}
          className="tpl-btnp"
          style={{ width: "auto", height: 36, padding: "0 14px", fontSize: 13, marginBottom: 0 }}
        >
          {BUTTON_ADD_PRODUCT}
        </button>
      </div>
    </div>
  );
}
