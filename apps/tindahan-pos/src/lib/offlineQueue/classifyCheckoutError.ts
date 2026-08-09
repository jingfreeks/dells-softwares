/**
 * Every business-rule rejection checkout_sale() can raise (see
 * supabase/migrations/0028_checkout_sale_device_caller.sql and
 * 0030_offline_checkout_support.sql's additions). Kept as one whitelist so
 * it's a single place to update if checkout_sale() ever raises a new one.
 */
const KNOWN_BUSINESS_RULE_MESSAGES = [
  "CREDIT_LIMIT_EXCEEDED",
  "INVALID_OVERRIDE_PIN",
  "EXPIRED_CASHIER_SESSION",
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
