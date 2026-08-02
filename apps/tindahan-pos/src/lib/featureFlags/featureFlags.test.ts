import { describe, expect, it } from "vitest";
import { resolveFlag } from "./featureFlagsContext";

describe("resolveFlag (kill switch, fail-open)", () => {
  it("returns true for a key with no row, so undeclared features stay on", () => {
    expect(resolveFlag(new Map(), "pack_pricing")).toBe(true);
  });

  it("returns false when a flag has been explicitly disabled", () => {
    const flags = new Map([["pack_pricing", false]]);
    expect(resolveFlag(flags, "pack_pricing")).toBe(false);
  });

  it("returns true when a flag has been explicitly enabled", () => {
    const flags = new Map([["pack_pricing", true]]);
    expect(resolveFlag(flags, "pack_pricing")).toBe(true);
  });

  it("only affects the specific key that was disabled", () => {
    const flags = new Map([["pack_pricing", false]]);
    expect(resolveFlag(flags, "pos_services")).toBe(true);
  });
});
