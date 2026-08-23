/**
 * Turn the platform's error codes into something a shop owner can act on.
 *
 * These are raised by triggers and RPCs in the database, so their text is
 * written for an operator reading a log. The one that reaches customers most
 * often is the register limit: pairing a fourth till on BASIC put the literal
 * string `LIMIT_EXCEEDED: devices (max 3)` on the screen of a brand-new
 * device, mid-setup.
 *
 * Only codes this codebase actually raises are translated. Anything else is
 * returned unchanged rather than replaced with a friendly generic, because a
 * message that hides the real fault is worse than an ugly one that names it.
 *
 * inventory-app carries its own copy. The two apps share no package, the same
 * way `permissions/` is duplicated between them -- worth revisiting if a
 * shared package ever exists, not worth inventing one for forty lines.
 */

/** What a shop owner calls each of these, which is not what the column is called. */
const RESOURCE_NAMES: Record<string, string> = {
  devices: "registers",
  products: "products",
  warehouses: "warehouses",
  branches: "branches",
};

/** `LIMIT_EXCEEDED: devices (max 3)` — raised by the plan-limit triggers. */
const LIMIT = /^LIMIT_EXCEEDED:\s*(\w+)\s*\(max (\d+)\)/;

/** `FEATURE_NOT_ENABLED: pos.utang` — raised by the entitlement triggers. */
const FEATURE = /FEATURE_NOT_ENABLED:\s*([a-z_]+\.[a-z_]+)/;

/** `REFUND_EXCEEDS_SOLD_QUANTITY: Sardines` — raised by refund_sale_items(). */
const REFUND_EXCEEDS = /REFUND_EXCEEDS_SOLD_QUANTITY:\s*(.+)/;

/**
 * Named per capability rather than answered generically, because the useful
 * half of the sentence is what the cashier should do INSTEAD. "Not part of
 * your plan" leaves someone standing at the counter with a customer in front
 * of them and no next step.
 */
const FEATURE_MESSAGES: Record<string, string> = {
  "pos.utang":
    "This store isn’t set up for utang. You can still take cash, GCash or card — " +
    "ask the owner if utang should be turned on.",
  "pos.void":
    "Voiding a sale isn’t part of this store’s plan. Ask the owner, or record a " +
    "return instead.",
  "inventory.transfers":
    "Stock transfers aren’t part of this store’s plan. Existing stock is unaffected.",
};

const GENERIC_FEATURE_MESSAGE =
  "This isn’t part of your current plan. Nothing you have already recorded is affected.";

/**
 * Supabase hands back a PostgrestError, which is a plain object and NOT an
 * Error. Reading only `err instanceof Error` therefore missed the single most
 * common shape in this codebase, and every translation below was unreachable
 * from an RPC or a PostgREST write -- the caller fell through to its generic
 * fallback and the cashier was told "Could not complete sale." with no reason.
 */
function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

export function describePlatformError(err: unknown, fallback = "Something went wrong."): string {
  const raw = messageOf(err);
  if (!raw) return fallback;

  const limit = LIMIT.exec(raw);
  if (limit) {
    const [, key, max] = limit;
    const noun = RESOURCE_NAMES[key] ?? key;
    return Number(max) === 0
      ? `Your plan does not currently allow any ${noun}. Contact support to change this.`
      : `Your plan includes ${max} ${noun}, and you are using all of them. ` +
          `Contact support to raise the limit.`;
  }

  const feature = FEATURE.exec(raw);
  if (feature) {
    return FEATURE_MESSAGES[feature[1]] ?? GENERIC_FEATURE_MESSAGE;
  }

  if (raw.includes("MODULE_NOT_ENABLED")) {
    return "This feature is not part of your current plan. Your existing records are unaffected.";
  }

  if (raw.includes("UNAUTHORIZED_ACTION") || raw.includes("ADMIN_ONLY")) {
    return "You do not have permission to do this. Ask the store owner.";
  }

  // void_sale() raises this bare, with no detail -- reachable in practice
  // whenever the list an admin is looking at is stale: a second admin voided
  // it first, or the page has been open since before someone else did.
  if (raw.includes("ALREADY_VOIDED")) {
    return "This sale has already been voided by someone else. Refresh to see the current list.";
  }

  if (raw.includes("VOID_REASON_REQUIRED")) {
    return "A reason is required to void a sale.";
  }

  // refund_sale_items() (BIR compliance §39, Phase 2b) raises this same
  // "someone else already changed it" shape as ALREADY_VOIDED above.
  if (raw.includes("SALE_ALREADY_VOIDED")) {
    return "This sale has already been voided, so it can't be refunded. Refresh to see the current list.";
  }

  if (raw.includes("REFUND_REASON_REQUIRED")) {
    return "A reason is required to refund a sale.";
  }

  if (raw.includes("ONLY_PRODUCT_LINES_REFUNDABLE")) {
    return "Only product lines can be refunded, not services.";
  }

  const refundExceeds = REFUND_EXCEEDS.exec(raw);
  if (refundExceeds) {
    return `You're trying to refund more ${refundExceeds[1]} than was actually sold on this transaction.`;
  }

  // A bare policy denial. The cause is genuinely ambiguous -- a capability the
  // plan does not include, a module switched off, or a suspended subscription
  // -- so this deliberately does NOT say "you do not have permission". Since
  // the tier split that is usually false, and it sends the owner off checking
  // staff roles for something no role can grant.
  if (raw.includes("row-level security policy") || raw.includes("violates row-level")) {
    return (
      "This isn’t available to your store right now — it may not be part of your plan, " +
      "or billing may need attention. Nothing you have already recorded is affected."
    );
  }

  return raw;
}
