import { useBillingState, useHasModule } from "../lib/modules";

/**
 * Two different reasons this store might not be able to change anything, and
 * they are not interchangeable.
 *
 *   Module not enabled  -- they do not have Inventory. Sales still work.
 *   Suspended/cancelled -- they do have it, but the account is not in good
 *                          standing. Nothing they own is affected.
 *
 * Telling someone their module lapsed when in fact they owe money sends them
 * to the wrong place, so each state says what is actually true and who can
 * fix it. Billing takes precedence when both apply: paying is the step that
 * unblocks everything, and the module question is moot until then.
 *
 * Every one of these says "read-only", never "no access". Architecture v1
 * §08 keeps reading and exporting available in every subscription state --
 * Suspended and Cancelled included -- and blocks only record creation, so
 * the data on screen behind this banner is genuinely still the tenant's to
 * read and export. Telling them they are locked out would be false.
 */
export function ModuleBanner() {
  const hasInventory = useHasModule("INVENTORY");
  const billing = useBillingState();

  if (billing && !billing.writesAllowed) {
    const cancelled = billing.subscriptionStatus === "CANCELLED";
    return (
      <div
        role="status"
        className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900"
      >
        <span className="font-medium">
          {cancelled ? "Your subscription has ended." : "Your account is suspended."}
        </span>{" "}
        New records can’t be created until it’s reactivated. Everything you’ve already
        recorded stays visible and exportable — nothing has been deleted.
      </div>
    );
  }

  // In grace. Still fully usable, which is the whole point of saying something
  // now rather than after it stops being usable.
  if (billing?.subscriptionStatus === "PAST_DUE") {
    const until = billing.graceEndsAt
      ? new Date(billing.graceEndsAt).toLocaleDateString()
      : null;
    return (
      <div
        role="status"
        className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
      >
        <span className="font-medium">Payment is overdue.</span>{" "}
        Everything still works{until ? ` until ${until}` : ""}, after which new records
        will be blocked. Existing records are never affected.
      </div>
    );
  }

  if (!hasInventory) {
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

  return null;
}
