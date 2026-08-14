import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { heldSaleHasIrreversibleService, holdSale, listHeldSales, removeHeldSale } from "../heldSales";
import type { HeldSale } from "../heldSales";

const STORE_ID = "store-1";

function makeSale(overrides: Partial<Omit<HeldSale, "id" | "createdAt">> = {}) {
  return {
    cartLines: [{ productId: "p1", quantity: 1 }],
    serviceLines: [],
    paymentType: "cash" as const,
    tendered: "0",
    referenceNo: "",
    selectedCustomerId: null,
    note: null,
    heldByCashierId: "staff-1",
    heldByName: "Aling Nena",
    ...overrides,
  };
}

describe("heldSales", () => {
  beforeEach(async () => {
    const existing = await listHeldSales(STORE_ID);
    await Promise.all(existing.map((s) => removeHeldSale(STORE_ID, s.id)));
  });

  it("round-trips a held sale", async () => {
    const saved = await holdSale(STORE_ID, makeSale({ tendered: "50" }));

    const all = await listHeldSales(STORE_ID);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: saved.id, tendered: "50", heldByName: "Aling Nena" });
  });

  it("orders held sales by createdAt", async () => {
    await holdSale(STORE_ID, makeSale({ tendered: "10" }));
    await new Promise((r) => setTimeout(r, 5));
    await holdSale(STORE_ID, makeSale({ tendered: "20" }));

    const all = await listHeldSales(STORE_ID);
    expect(all.map((s) => s.tendered)).toEqual(["10", "20"]);
  });

  it("removes a held sale", async () => {
    const saved = await holdSale(STORE_ID, makeSale());
    await removeHeldSale(STORE_ID, saved.id);

    expect(await listHeldSales(STORE_ID)).toHaveLength(0);
  });

  it("scopes held sales independently per storeId", async () => {
    await holdSale(STORE_ID, makeSale({ tendered: "1" }));
    await holdSale("store-2", makeSale({ tendered: "2" }));

    expect((await listHeldSales(STORE_ID)).map((s) => s.tendered)).toEqual(["1"]);
    expect((await listHeldSales("store-2")).map((s) => s.tendered)).toEqual(["2"]);

    await Promise.all((await listHeldSales("store-2")).map((s) => removeHeldSale("store-2", s.id)));
  });

  it("generates its own id and createdAt", async () => {
    const saved = await holdSale(STORE_ID, makeSale());
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
  });
});

describe("heldSaleHasIrreversibleService", () => {
  function saleWithServiceLabel(label: string): HeldSale {
    return {
      ...makeSale({ serviceLines: [{ id: "svc-1", label, amount: 100, fee: 5 }] }),
      id: "h1",
      createdAt: new Date().toISOString(),
    };
  }

  it("is true for an e-load line", () => {
    expect(heldSaleHasIrreversibleService(saleWithServiceLabel("Globe load ₱100 · 09171234567"))).toBe(true);
  });

  it("is true for a cash-in line", () => {
    expect(heldSaleHasIrreversibleService(saleWithServiceLabel("GCash cash-in ₱500 · 09171234567 · ref 123456"))).toBe(
      true
    );
  });

  it("is true for a cash-out line", () => {
    expect(heldSaleHasIrreversibleService(saleWithServiceLabel("GCash cash-out ₱500 · ref 123456"))).toBe(true);
  });

  it("is false for a plain print/photocopy service", () => {
    expect(heldSaleHasIrreversibleService(saleWithServiceLabel("Photocopy x3"))).toBe(false);
  });

  it("is false when there are no service lines", () => {
    const held: HeldSale = { ...makeSale(), id: "h1", createdAt: new Date().toISOString() };
    expect(heldSaleHasIrreversibleService(held)).toBe(false);
  });
});
