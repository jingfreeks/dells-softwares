import { useHasModule } from "../lib/modules";

/**
 * Shown when the Inventory module is not enabled for this store.
 *
 * Deliberately says "read-only", not "no access". Architecture v1 §08 keeps
 * reading and exporting available in every subscription state -- Suspended
 * and Cancelled included -- and blocks only record creation, so the data on
 * screen behind this banner is genuinely still the tenant's to read and
 * export. Telling them they are locked out would be false.
 */
export function ModuleBanner() {
  const hasInventory = useHasModule("INVENTORY");
  if (hasInventory) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
    >
      <span className="font-medium">Inventory is read-only.</span>{" "}
      This module isn’t enabled for your store, so warehouses, purchase orders, transfers and
      stock counts can’t be changed. Your existing records stay visible and exportable.
    </div>
  );
}
