import { describe, expect, it } from "vitest";
import { describePlatformError } from "./platformErrors";

describe("describePlatformError", () => {
  it("explains the register limit instead of printing the trigger's text", () => {
    // What a customer saw on a brand-new till, mid-setup, before this existed.
    const msg = describePlatformError("LIMIT_EXCEEDED: devices (max 3)");
    expect(msg).toContain("3 registers");
    expect(msg).toContain("Contact support");
    expect(msg).not.toContain("LIMIT_EXCEEDED");
  });

  it("calls them registers, not devices", () => {
    // The column is `devices`; nobody in a sari-sari store says that.
    expect(describePlatformError("LIMIT_EXCEEDED: devices (max 1)")).not.toContain("devices");
  });

  it("reads naturally at a ceiling of zero", () => {
    const msg = describePlatformError("LIMIT_EXCEEDED: devices (max 0)");
    expect(msg).toMatch(/does not currently allow any registers/i);
    expect(msg).not.toContain("0 registers");
  });

  it("handles the other limit keys", () => {
    expect(describePlatformError("LIMIT_EXCEEDED: products (max 5000)")).toContain("5000 products");
  });

  it("falls back to the raw key for a limit it has no name for", () => {
    expect(describePlatformError("LIMIT_EXCEEDED: widgets (max 2)")).toContain("2 widgets");
  });

  it("explains a module that is not part of the plan", () => {
    expect(describePlatformError("MODULE_NOT_ENABLED")).toMatch(/not part of your current plan/i);
  });

  it("explains both permission refusals this codebase raises", () => {
    expect(describePlatformError("UNAUTHORIZED_ACTION")).toMatch(/ask the store owner/i);
    // void_sale() has raised ADMIN_ONLY since long before the platform work.
    expect(describePlatformError("ADMIN_ONLY")).toMatch(/ask the store owner/i);
  });

  it("passes an unrecognised message through UNCHANGED", () => {
    // A friendly generic here would bury the real fault.
    const raw = "INVALID_OR_EXPIRED_CODE";
    expect(describePlatformError(raw)).toBe(raw);
  });

  it("accepts an Error as well as a string", () => {
    expect(describePlatformError(new Error("LIMIT_EXCEEDED: devices (max 2)"))).toContain(
      "2 registers"
    );
  });

  it("uses the caller's fallback for an empty or non-error input", () => {
    expect(describePlatformError("", "Could not pair this device.")).toBe(
      "Could not pair this device."
    );
    expect(describePlatformError(null, "Could not pair this device.")).toBe(
      "Could not pair this device."
    );
  });
});
