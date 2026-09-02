/**
 * Every business-rule rejection checkout_sale() can raise (see
 * supabase/migrations/0028_checkout_sale_device_caller.sql and
 * 0030_offline_checkout_support.sql's additions). Kept as one whitelist so
 * it's a single place to update if checkout_sale() ever raises a new one.
 */
const KNOWN_BUSINESS_RULE_MESSAGES = [
  "CREDIT_LIMIT_EXCEEDED",
  // Raised by enforce_utang_feature() (20260815111000), a BEFORE INSERT
  // trigger on `sales` -- so it comes back out of checkout_sale() like any
  // other business-rule rejection. Without it here, a credit sale from a
  // store that does not hold pos.utang falls through to the default and is
  // treated as a CONNECTIVITY failure: queued for replay, retried against a
  // server that will refuse it every time, and never shown to the cashier.
  // A sale that cannot happen would look to them like a sale that did.
  "FEATURE_NOT_ENABLED",
  "INVALID_OVERRIDE_PIN",
  // Raised by checkout_sale()'s credit-override lockout (20260815146000) --
  // without this here, a genuinely locked-out cashier's rejected attempt
  // would fall through to "assume connectivity", get queued for offline
  // replay, and fail the same way on every retry while looking like a
  // completed sale in the meantime.
  "OVERRIDE_PIN_LOCKED",
  "EXPIRED_CASHIER_SESSION",
  // Raised by guard_org_writes_allowed() (20260901160000), a BEFORE INSERT
  // trigger on `sales`, when the tenant's organization is suspended or
  // cancelled. Same shape as FEATURE_NOT_ENABLED above and the same trap:
  // without it here, a refused sale falls through to "assume connectivity",
  // is queued for replay, and is shown to the cashier as complete -- receipt
  // printed, stock decremented locally -- while the server refuses it on
  // every retry, forever. A suspended shop would take money for sales that
  // do not exist.
  "ORG_WRITES_SUSPENDED",
  // Raised by checkout_sale()'s own discount validation (>100% off, a
  // negative/zero value, or an unrecognized discount type) -- without these
  // here, a rejected discount fell through to "assume connectivity" too: the
  // sale was queued for replay and shown to the cashier as complete (receipt
  // printed, stock decremented locally) even though it would fail forever
  // once actually synced, since checkout_sale() rejects the same discount
  // every retry.
  "INVALID_DISCOUNT_TYPE",
  "INVALID_DISCOUNT_VALUE",
  "INVALID_OCCURRED_AT",
  "DEVICE_LIMIT_REACHED",
  "Insufficient stock",
  "Cart is empty",
  "A customer is required for a credit sale",
  "A reference number is required for a QR payment",
  "Invalid payment type",
  "Invalid quantity",
  "Duplicate product in cart",
  "Product not found in this store",
  "Not a registered staff member of any store",
  "Customer not found in this store",
  "Service label is required",
  "Invalid service amount",
  "Invalid service fee",
  "Service amount exceeds the maximum allowed per transaction",
];

function errorMessage(err: unknown): string | null {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }
  if (typeof err === "string") return err;
  return null;
}

/**
 * Distinguishes a genuine connectivity failure (the RPC call never really
 * reached/returned from the server) from a legitimate business-rule
 * rejection (the server responded, and said no). Only the former should be
 * queued for later replay — the latter needs to surface to the cashier
 * right now, exactly as it does today.
 *
 * Supabase doesn't give a clean, dedicated "this was a network error" type
 * from the client SDK, so this is necessarily a bit heuristic. When it's
 * genuinely ambiguous, this defaults to "connectivity failure": queuing an
 * already-successful-looking sale is recoverable (checkout_sale is
 * idempotent on client_request_id), but wrongly blocking a real offline
 * sale isn't.
 */
export function isConnectivityFailure(err: unknown): boolean {
  const message = errorMessage(err);
  if (message === null) return true;
  const lower = message.toLowerCase();
  return !KNOWN_BUSINESS_RULE_MESSAGES.some((known) => lower.includes(known.toLowerCase()));
}
