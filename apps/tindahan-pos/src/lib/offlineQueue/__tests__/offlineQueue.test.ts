import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { countPending, enqueueSale, listQueuedSales, removeQueuedSale, updateQueuedSale } from "../offlineQueue";
import type { QueuedSale } from "../offlineQueue";

const STORE_ID = "store-1";

function makeSale(overrides: Partial<Omit<QueuedSale, "status" | "attempts" | "lastError" | "createdAt" | "updatedAt">> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    payload: {
      items: [{ product_id: "p1", quantity: 1 }],
      services: [],
      customerId: null,
      paymentType: "cash" as const,
      referenceNo: null,
      overridePin: null,
      cashierToken: null,
    },
    occurredAt: new Date().toISOString(),
    cashierName: "Aling Nena",
    total: 9,
    ...overrides,
  };
}

describe("offlineQueue", () => {
  beforeEach(async () => {
    const existing = await listQueuedSales(STORE_ID);
    await Promise.all(existing.map((s) => removeQueuedSale(STORE_ID, s.id)));
  });

  it("round-trips an enqueued sale with status 'pending'", async () => {
    const sale = makeSale({ id: "s1" });
    await enqueueSale(STORE_ID, sale);

    const all = await listQueuedSales(STORE_ID);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: "s1", status: "pending", attempts: 0, lastError: null });
  });

  it("orders queued sales by createdAt", async () => {
    await enqueueSale(STORE_ID, makeSale({ id: "first" }));
    await new Promise((r) => setTimeout(r, 5));
    await enqueueSale(STORE_ID, makeSale({ id: "second" }));

    const all = await listQueuedSales(STORE_ID);
    expect(all.map((s) => s.id)).toEqual(["first", "second"]);
  });

  it("updates a queued sale's status and error", async () => {
    await enqueueSale(STORE_ID, makeSale({ id: "s1" }));
    await updateQueuedSale(STORE_ID, "s1", { status: "failed", lastError: "CREDIT_LIMIT_EXCEEDED" });

    const all = await listQueuedSales(STORE_ID);
    expect(all[0]).toMatchObject({ status: "failed", lastError: "CREDIT_LIMIT_EXCEEDED" });
  });

  it("removes a queued sale", async () => {
    await enqueueSale(STORE_ID, makeSale({ id: "s1" }));
    await removeQueuedSale(STORE_ID, "s1");

    expect(await listQueuedSales(STORE_ID)).toHaveLength(0);
  });

  it("counts pending and failed sales, excluding synced/syncing/needs_cashier_reauth", async () => {
    await enqueueSale(STORE_ID, makeSale({ id: "a" }));
    await enqueueSale(STORE_ID, makeSale({ id: "b" }));
    await enqueueSale(STORE_ID, makeSale({ id: "c" }));
    await updateQueuedSale(STORE_ID, "b", { status: "synced" });
    await updateQueuedSale(STORE_ID, "c", { status: "failed" });

    expect(await countPending(STORE_ID)).toBe(2);
  });

  it("scopes queues independently per storeId", async () => {
    await enqueueSale(STORE_ID, makeSale({ id: "s1" }));
    await enqueueSale("store-2", makeSale({ id: "s2" }));

    expect((await listQueuedSales(STORE_ID)).map((s) => s.id)).toEqual(["s1"]);
    expect((await listQueuedSales("store-2")).map((s) => s.id)).toEqual(["s2"]);

    await Promise.all((await listQueuedSales("store-2")).map((s) => removeQueuedSale("store-2", s.id)));
  });
});
