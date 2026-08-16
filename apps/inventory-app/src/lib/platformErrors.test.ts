import { describe, expect, it } from "vitest";
import { describeWriteError } from "./platformErrors";
import { isAtLimit, findLimit, type StoreLimit } from "./storeLimits";

describe("describeWriteError", () => {
  it("turns a limit refusal into a sentence with the real number", () => {
    // Exactly what reached a shop owner's screen before this existed.
    const msg = describeWriteError(new Error("LIMIT_EXCEEDED: warehouses (max 3)"));
    expect(msg).toContain("3 warehouses");
    expect(msg).toContain("contact support");
    expect(msg).not.toContain("LIMIT_EXCEEDED");
  });

  it("reassures them their existing records are untouched", () => {
    // The database never deletes on a limit; saying so prevents a panic call.
    expect(describeWriteError(new Error("LIMIT_EXCEEDED: products (max 5000)"))).toMatch(
      /unaffected/i
    );
  });

  it("reads naturally for a ceiling of zero rather than saying '0 warehouses'", () => {
    const msg = describeWriteError(new Error("LIMIT_EXCEEDED: warehouses (max 0)"));
    expect(msg).toMatch(/does not currently allow any warehouses/i);
    expect(msg).not.toContain("0 warehouses");
  });

  it("uses the word a shop owner would use for devices", () => {
    expect(describeWriteError(new Error("LIMIT_EXCEEDED: devices (max 3)"))).toContain(
      "3 registers"
    );
  });

  it("falls back to the raw key for a limit it has no name for", () => {
    // Better an unpolished noun than a wrong one.
    expect(describeWriteError(new Error("LIMIT_EXCEEDED: widgets (max 2)"))).toContain("2 widgets");
  });

  it("explains a module that is not part of the plan", () => {
    expect(describeWriteError(new Error("MODULE_NOT_ENABLED"))).toMatch(/not part of your current plan/i);
  });

  it("explains a permission refusal in terms of who to ask", () => {
    expect(describeWriteError(new Error("UNAUTHORIZED_ACTION"))).toMatch(/ask the store owner/i);
  });

  it("translates a raw policy denial, which says nothing to a user", () => {
    const raw = 'new row violates row-level security policy for table "warehouses"';
    expect(describeWriteError(new Error(raw))).toMatch(/do not have permission/i);
  });

  it("passes an unrecognised error through UNCHANGED", () => {
    // A friendly generic here would hide the real fault. An ugly message that
    // names the problem beats a pleasant one that buries it.
    const raw = "duplicate key value violates unique constraint";
    expect(describeWriteError(new Error(raw))).toBe(raw);
  });

  it("uses the caller's fallback for a non-Error", () => {
    expect(describeWriteError("something", "Could not save warehouse.")).toBe(
      "Could not save warehouse."
    );
    expect(describeWriteError(null, "Could not load warehouses.")).toBe(
      "Could not load warehouses."
    );
  });
});

describe("isAtLimit", () => {
  const limits: StoreLimit[] = [
    { moduleCode: "INVENTORY", limitKey: "warehouses", cap: 3, currentUsage: 3 },
    { moduleCode: "POS", limitKey: "devices", cap: 3, currentUsage: 1 },
    { moduleCode: "POS", limitKey: "products", cap: null, currentUsage: 9000 },
  ];

  it("is true at the ceiling", () => {
    expect(isAtLimit(limits, "warehouses")).toBe(true);
  });

  it("is false with room to spare", () => {
    expect(isAtLimit(limits, "devices")).toBe(false);
  });

  it("is false when there is no ceiling, however large the usage", () => {
    expect(isAtLimit(limits, "products")).toBe(false);
  });

  it("is false for a key the store has no limit for", () => {
    // Never warn about a ceiling that does not exist.
    expect(isAtLimit(limits, "branches")).toBe(false);
    expect(findLimit(limits, "branches")).toBeUndefined();
  });

  it("is false before the limits have loaded", () => {
    expect(isAtLimit([], "warehouses")).toBe(false);
  });
});
