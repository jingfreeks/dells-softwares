import { LABEL_PRODUCTS_TAB, LABEL_SERVICES_TAB } from "@/lib";
import type { PosTab } from "../hooks";

interface PosTabsProps {
  visible: boolean;
  activeTab: PosTab;
  onTabChange: (tab: PosTab) => void;
}

export function PosTabs({ visible, activeTab, onTabChange }: PosTabsProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onTabChange("products")}
          className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "products" ? "bg-[var(--color-brand)] text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {LABEL_PRODUCTS_TAB}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("services")}
          className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "services" ? "bg-[var(--color-brand)] text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {LABEL_SERVICES_TAB}
        </button>
      </div>
    </div>
  );
}
