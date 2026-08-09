import {
  TEXT_ALWAYS_SYNCED_HEADING,
  TEXT_ALWAYS_SYNCED_DESC,
  TEXT_SALES_COUNT_SUFFIX,
  TEXT_PRODUCTS_COUNT_SUFFIX,
  TEXT_CUSTOMERS_COUNT_SUFFIX,
  BUTTON_REFRESH_NOW,
  BUTTON_REFRESHING,
} from "@/lib";

interface SyncStatusCardProps {
  salesCount: number;
  productsCount: number;
  customersCount: number;
  refreshing: boolean;
  onRefreshNow: () => void;
}

export function SyncStatusCard({ salesCount, productsCount, customersCount, refreshing, onRefreshNow }: SyncStatusCardProps) {
  return (
    <div
      className="tpl-note tpl-g flex-col! items-stretch! sm:flex-row! sm:items-center!"
      style={{ marginBottom: 11 }}
    >
      <div className="flex items-start gap-3">
        <i className="ti ti-cloud-check" style={{ color: "var(--tpl-okd)", marginTop: 2, flexShrink: 0 }} aria-hidden />
        <div className="tpl-flex1">
          <p className="tpl-h3">{TEXT_ALWAYS_SYNCED_HEADING}</p>
          <p className="tpl-ns" style={{ color: "var(--tpl-okd)" }}>
            {TEXT_ALWAYS_SYNCED_DESC} · {salesCount} {TEXT_SALES_COUNT_SUFFIX}, {productsCount} {TEXT_PRODUCTS_COUNT_SUFFIX},{" "}
            {customersCount} {TEXT_CUSTOMERS_COUNT_SUFFIX}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="tpl-btn w-full! sm:w-auto!"
        style={{ height: 32, padding: "0 14px", marginBottom: 0, whiteSpace: "nowrap", flexShrink: 0 }}
        onClick={onRefreshNow}
        disabled={refreshing}
      >
        {refreshing ? BUTTON_REFRESHING : BUTTON_REFRESH_NOW}
      </button>
    </div>
  );
}
