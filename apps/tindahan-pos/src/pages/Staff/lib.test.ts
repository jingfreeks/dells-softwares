import { describe, expect, it } from "vitest";
import { makeSaleRecord, makeStore } from "../../test/testUtils";
import { voidsThisWeek, drawerVarianceThisWeek, cashierPermissions, type ClosedShift } from "./lib";

function makeClosedShift(overrides: Partial<ClosedShift> = {}): ClosedShift {
  return {
    id: "shift-1",
    staffId: "staff-1",
    staffName: "Aling Nena",
    createdAt: "2026-08-15T07:00:00Z",
    revokedAt: "2026-08-15T15:00:00Z",
    openingFloat: 2000,
    closingFloat: 3175,
    expectedClosing: 3215,
    variance: -40,
    ...overrides,
  };
}

describe("voidsThisWeek", () => {
  it("sums only voided sales", () => {
    const sales = [
      makeSaleRecord({ id: "s1", status: "completed", total: 100 }),
      makeSaleRecord({ id: "s2", status: "voided", total: 44 }),
      makeSaleRecord({ id: "s3", status: "voided", total: 25 }),
    ];
    expect(voidsThisWeek(sales)).toEqual({ count: 2, total: 69 });
  });

  it("returns zero for no voided sales", () => {
    expect(voidsThisWeek([makeSaleRecord({ status: "completed" })])).toEqual({ count: 0, total: 0 });
  });
});

describe("drawerVarianceThisWeek", () => {
  it("sums variance across closed shifts", () => {
    const shifts = [makeClosedShift({ variance: -40 }), makeClosedShift({ id: "shift-2", variance: 15 })];
    expect(drawerVarianceThisWeek(shifts)).toEqual({ shiftCount: 2, netVariance: -25 });
  });

  it("returns zero for no closed shifts", () => {
    expect(drawerVarianceThisWeek([])).toEqual({ shiftCount: 0, netVariance: 0 });
  });
});

describe("cashierPermissions", () => {
  it("marks Change prices as allowed when the store permits it, independent of route access", () => {
    const permissions = cashierPermissions(makeStore({ cashierCanEditPrices: true }));
    expect(permissions.find((p) => p.label === "Change prices")).toMatchObject({ state: "allowed" });
  });

  it("marks Change prices as blocked when the store does not permit it", () => {
    const permissions = cashierPermissions(makeStore({ cashierCanEditPrices: false }));
    expect(permissions.find((p) => p.label === "Change prices")).toMatchObject({ state: "blocked" });
  });
});
