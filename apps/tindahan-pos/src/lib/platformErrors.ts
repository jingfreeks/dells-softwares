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

export function describePlatformError(err: unknown, fallback = "Something went wrong."): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
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

  if (raw.includes("MODULE_NOT_ENABLED")) {
    return "This feature is not part of your current plan. Your existing records are unaffected.";
  }

  if (raw.includes("UNAUTHORIZED_ACTION") || raw.includes("ADMIN_ONLY")) {
    return "You do not have permission to do this. Ask the store owner.";
  }

  return raw;
}
