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
    <div className="tpl-seg" style={{ maxWidth: 230, marginBottom: 0 }}>
      <button
        type="button"
        onClick={() => onTabChange("products")}
        className={activeTab === "products" ? "tpl-on" : ""}
      >
        {LABEL_PRODUCTS_TAB}
      </button>
      <button
        type="button"
        onClick={() => onTabChange("services")}
        className={activeTab === "services" ? "tpl-on" : ""}
      >
        {LABEL_SERVICES_TAB}
      </button>
    </div>
  );
}
