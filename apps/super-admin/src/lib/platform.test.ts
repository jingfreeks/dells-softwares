import { describe, expect, it } from "vitest";
import { outranksPlan, blocksWrites } from "./platform";

describe("outranksPlan", () => {
  // The two sources that survive a plan change, and therefore need handing
  // back explicitly rather than expiring on renewal.
  it("treats a deliberate comp as outranking the plan", () => {
    expect(outranksPlan("MANUAL")).toBe(true);
  });

  // Added by 20260815113000. Without this the console would offer no way to
  // hand back a grandfathered grant, and every one of them -- 15 features
  // across every tenant alive at the split -- would be stuck outranking the
  // plan forever with no button to undo it.
  it("treats a grandfathered grant as outranking the plan too", () => {
    expect(outranksPlan("GRANDFATHERED")).toBe(true);
  });

  it("leaves a plan-derived grant alone", () => {
    expect(outranksPlan("SUBSCRIPTION")).toBe(false);
    expect(outranksPlan("TRIAL")).toBe(false);
  });

  // source is nullable: a feature the tenant has no row for at all.
  it("handles a missing source without claiming it outranks anything", () => {
    expect(outranksPlan(null)).toBe(false);
  });
});

describe("blocksWrites", () => {
  it("withdraws writes only in the two states that mean unpaid", () => {
    expect(blocksWrites("SUSPENDED")).toBe(true);
    expect(blocksWrites("CANCELLED")).toBe(true);
  });

  it("leaves a healthy or merely late tenant writing", () => {
    expect(blocksWrites("ACTIVE")).toBe(false);
    expect(blocksWrites("TRIALING")).toBe(false);
    // PAST_DUE is inside the grace window -- §08 keeps them working.
    expect(blocksWrites("PAST_DUE")).toBe(false);
  });

  // A provisioning gap must not read as a suspension.
  it("does not treat an absent subscription as a suspension", () => {
    expect(blocksWrites(null)).toBe(false);
  });
});
