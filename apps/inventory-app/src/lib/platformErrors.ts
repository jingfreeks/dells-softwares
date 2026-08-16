/**
 * Turn the platform's error codes into something a shop owner can act on.
 *
 * These are raised by triggers and RPCs in the database, which means their
 * text is written for an operator reading a log, not for whoever is standing
 * at the counter. Before this, adding a fourth warehouse on BASIC put the
 * literal string `LIMIT_EXCEEDED: warehouses (max 3)` on screen.
 *
 * Only codes this codebase actually raises are translated. Anything else is
 * returned unchanged rather than replaced with a friendly generic, because a
 * message that hides the real fault is worse than an ugly one that names it.
 */

const RESOURCE_NAMES: Record<string, string> = {
  warehouses: "warehouses",
  products: "products",
  devices: "registers",
  branches: "branches",
};

/** `LIMIT_EXCEEDED: warehouses (max 3)` — raised by the plan-limit triggers. */
const LIMIT = /^LIMIT_EXCEEDED:\s*(\w+)\s*\(max (\d+)\)/;

export function describeWriteError(err: unknown, fallback = "Something went wrong."): string {
  if (!(err instanceof Error)) return fallback;
  const raw = err.message;

  const limit = LIMIT.exec(raw);
  if (limit) {
    const [, key, max] = limit;
    const noun = RESOURCE_NAMES[key] ?? key;
    return Number(max) === 0
      ? `Your plan does not currently allow any ${noun}. Contact support to change this.`
      : `Your plan includes ${max} ${noun}, and you are using all of them. ` +
          `Existing ${noun} are unaffected — contact support to raise the limit.`;
  }

  if (raw.includes("MODULE_NOT_ENABLED")) {
    return "This feature is not part of your current plan. Your existing records are unaffected.";
  }

  if (raw.includes("UNAUTHORIZED_ACTION")) {
    return "You do not have permission to do this. Ask the store owner.";
  }

  // A policy denial. The cause is genuinely ambiguous here -- a missing
  // permission, a module that is off, or a suspended subscription -- and the
  // last two already put a banner on the screen, so naming the most common
  // cause beats guessing between three.
  if (raw.includes("row-level security policy") || raw.includes("violates row-level")) {
    return "You do not have permission to make this change.";
  }

  return raw;
}
