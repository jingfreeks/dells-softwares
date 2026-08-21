import { describe, expect, it } from "vitest";
import {
  outranksPlan,
  blocksWrites,
  featuresLostByPlanChange,
  planPriceLabel,
  type OrganizationFeature,
  type Plan,
} from "./platform";

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

function feature(over: Partial<OrganizationFeature> = {}): OrganizationFeature {
  return {
    featureCode: "inventory.transfers",
    moduleCode: "INVENTORY",
    name: "Stock transfers",
    enabled: true,
    source: "SUBSCRIPTION",
    moduleHeld: true,
    ...over,
  };
}

function plan(over: Partial<Plan> = {}): Plan {
  return {
    planCode: "BASIC",
    name: "Basic",
    description: null,
    pricePhp: null,
    billingInterval: null,
    isActive: true,
    modules: ["POS", "INVENTORY"],
    features: ["pos.utang", "inventory.suppliers"],
    ...over,
  };
}

describe("featuresLostByPlanChange", () => {
  it("names a plan-derived feature the target plan does not sell", () => {
    const lost = featuresLostByPlanChange([feature()], plan());
    expect(lost.map((f) => f.featureCode)).toEqual(["inventory.transfers"]);
  });

  it("says nothing about a feature the target plan does sell", () => {
    const held = feature({ featureCode: "pos.utang", moduleCode: "POS" });
    expect(featuresLostByPlanChange([held], plan())).toEqual([]);
  });

  // The point of the whole calculation. After the tier split every existing
  // tenant is grandfathered, so if these counted, the console would warn
  // loudly about a change that takes nothing away -- and an operator who
  // learns the warning is wrong stops reading warnings.
  it("does not count a grandfathered grant, which survives the change", () => {
    expect(featuresLostByPlanChange([feature({ source: "GRANDFATHERED" })], plan())).toEqual([]);
  });

  it("nor a deliberate comp", () => {
    expect(featuresLostByPlanChange([feature({ source: "MANUAL" })], plan())).toEqual([]);
  });

  it("nor one that is already switched off", () => {
    expect(featuresLostByPlanChange([feature({ enabled: false })], plan())).toEqual([]);
  });

  // Holding a feature without its module is not holding it -- core.feature_enabled()
  // requires the module, so a plan that drops INVENTORY takes its features too
  // even if it somehow still lists them.
  it("counts a feature whose module the target plan drops", () => {
    const target = plan({ modules: ["POS"], features: ["inventory.transfers"] });
    const lost = featuresLostByPlanChange([feature()], target);
    expect(lost.map((f) => f.featureCode)).toEqual(["inventory.transfers"]);
  });
});

describe("planPriceLabel", () => {
  const plan = (over: Partial<Plan> = {}): Plan => ({
    planCode: "BUSINESS",
    name: "Business",
    description: null,
    pricePhp: 599,
    billingInterval: "MONTHLY",
    isActive: true,
    modules: ["POS", "INVENTORY"],
    features: [],
    ...over,
  });

  it("formats a real price with the billing interval", () => {
    expect(planPriceLabel(plan({ pricePhp: 599 }))).toBe("₱599/month");
  });

  // ENTERPRISE's null is a decision (custom pricing, negotiated per contract
  // -- see 20260815120000), not a missing value. An operator reading "Custom"
  // must not mistake it for a plan nobody has priced yet.
  it("reads a null price as custom, not as missing", () => {
    expect(planPriceLabel(plan({ pricePhp: null }))).toBe("Custom");
  });

  it("does not crash on a billing interval it has not seen", () => {
    expect(planPriceLabel(plan({ pricePhp: 100, billingInterval: "WEEKLY" }))).toBe("₱100/month");
  });
});
