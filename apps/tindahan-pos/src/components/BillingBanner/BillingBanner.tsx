import { useAuth, useBillingState } from "@/lib";

/**
 * The §08 billing warning, for the POS.
 *
 * SHOWN TO ADMINS ONLY, deliberately. Three reasons, and they compound:
 *
 *   - A cashier cannot act on it. Only the owner can pay a bill or call
 *     support, so to everyone else it is an alarming message with no
 *     available response.
 *   - The POS screen faces the customer. "Your account is suspended" over
 *     the till, mid-sale, in front of whoever is buying, is a bad moment for
 *     the store owner that serves no purpose.
 *   - Nothing in the POS is blocked by billing state anyway. Suspension
 *     currently withdraws back-office writes only -- selling still works --
 *     so a cashier will never hit a failure this would have explained.
 *     If POS gating is ever adopted (see PLATFORM.md), that third reason
 *     disappears and this decision is worth revisiting: a cashier whose
 *     sale is refused DOES need to know why.
 *
 * A paired device session has no staff row at all, so a bare register never
 * reaches this in the first place.
 *
 * Every message says "read-only" or "can't add new", never "no access".
 * Architecture v1 §08 keeps reading and exporting available in every
 * subscription state, so the records behind this banner are still the
 * tenant's to read and export. Telling them otherwise would be false.
 */
export function BillingBanner() {
  const { user } = useAuth();
  const billing = useBillingState();

  if (!billing || user?.role !== "admin") return null;

  if (!billing.writesAllowed) {
    const cancelled = billing.subscriptionStatus === "CANCELLED";
    return (
      <div
        role="status"
        className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900"
      >
        <span className="font-medium">
          {cancelled ? "Your subscription has ended." : "Your account is suspended."}
        </span>{" "}
        Selling still works, but new back-office records — products, suppliers,
        purchase orders, stock counts — can’t be created until it’s reactivated.
        Nothing you’ve already recorded has been touched.
      </div>
    );
  }

  if (billing.subscriptionStatus === "PAST_DUE") {
    const until = billing.graceEndsAt
      ? new Date(billing.graceEndsAt).toLocaleDateString()
      : null;
    return (
      <div
        role="status"
        className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
      >
        <span className="font-medium">Payment is overdue.</span>{" "}
        Everything still works{until ? ` until ${until}` : ""}. After that, new
        back-office records will be blocked — selling is unaffected either way.
      </div>
    );
  }

  if (billing.subscriptionStatus === "TRIALING") {
    const until = billing.trialEndsAt
      ? new Date(billing.trialEndsAt).toLocaleDateString()
      : null;
    return (
      <div
        role="status"
        className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
      >
        <span className="font-medium">You're on a free trial.</span>{" "}
        {until ? `Ends ${until}. ` : ""}After that you'll move back to Basic —
        everything you've recorded stays exactly where it is.
      </div>
    );
  }

  return null;
}
