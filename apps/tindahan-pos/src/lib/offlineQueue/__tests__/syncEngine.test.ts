import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabaseClient";
import { enqueueSale, listQueuedSales, removeQueuedSale } from "../offlineQueue";
import { drainQueue, resumeAfterReauth } from "../syncEngine";

vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: vi.fn() } }));
const mockedRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

const STORE_ID = "store-1";

function makeSale(id: string, cashierToken: string | null = "tok-1") {
  return {
    id,
    payload: {
      items: [{ product_id: "p1", quantity: 1 }],
      services: [],
      customerId: null,
      paymentType: "cash" as const,
      referenceNo: null,
      overridePin: null,
      cashierToken,
    },
    occurredAt: new Date().toISOString(),
    cashierName: "Aling Nena",
    total: 9,
  };
}

describe("syncEngine", () => {
  beforeEach(async () => {
    mockedRpc.mockReset();
    const existing = await listQueuedSales(STORE_ID);
    await Promise.all(existing.map((s) => removeQueuedSale(STORE_ID, s.id)));
  });

  it("drains a single pending sale and marks it synced on success", async () => {
    await enqueueSale(STORE_ID, makeSale("s1"));
    mockedRpc.mockResolvedValue({ data: [{ sale_id: "real-1", total: 9 }], error: null });

    const changed = await drainQueue(STORE_ID);

    expect(changed).toBe(true);
    const all = await listQueuedSales(STORE_ID);
    expect(all[0].status).toBe("synced");
    expect(mockedRpc).toHaveBeenCalledWith(
      "checkout_sale",
      expect.objectContaining({ p_client_request_id: "s1", p_is_offline_replay: true })
    );
  });

  it("drains multiple items in order, one at a time", async () => {
    await enqueueSale(STORE_ID, makeSale("a"));
    await new Promise((r) => setTimeout(r, 5));
    await enqueueSale(STORE_ID, makeSale("b"));
    const callOrder: string[] = [];
    mockedRpc.mockImplementation(async (_fn: string, params: { p_client_request_id: string }) => {
      callOrder.push(params.p_client_request_id);
      return { data: [{ sale_id: `real-${params.p_client_request_id}`, total: 9 }], error: null };
    });

    await drainQueue(STORE_ID);

    expect(callOrder).toEqual(["a", "b"]);
  });

  it("stops draining and marks the item needs_cashier_reauth on an expired session, without touching later items", async () => {
    await enqueueSale(STORE_ID, makeSale("a"));
    await new Promise((r) => setTimeout(r, 5));
    await enqueueSale(STORE_ID, makeSale("b"));
    mockedRpc.mockResolvedValue({ data: null, error: { message: "EXPIRED_CASHIER_SESSION" } });

    await drainQueue(STORE_ID);

    const all = await listQueuedSales(STORE_ID);
    expect(all.find((s) => s.id === "a")?.status).toBe("needs_cashier_reauth");
    expect(all.find((s) => s.id === "b")?.status).toBe("pending");
    expect(mockedRpc).toHaveBeenCalledTimes(1);
  });

  it("marks a business-rule rejection as failed but keeps draining subsequent items", async () => {
    await enqueueSale(STORE_ID, makeSale("a"));
    await new Promise((r) => setTimeout(r, 5));
    await enqueueSale(STORE_ID, makeSale("b"));
    mockedRpc
      .mockResolvedValueOnce({ data: null, error: { message: "CREDIT_LIMIT_EXCEEDED" } })
      .mockResolvedValueOnce({ data: [{ sale_id: "real-b", total: 9 }], error: null });

    await drainQueue(STORE_ID);

    const all = await listQueuedSales(STORE_ID);
    expect(all.find((s) => s.id === "a")).toMatchObject({ status: "failed", lastError: "CREDIT_LIMIT_EXCEEDED" });
    expect(all.find((s) => s.id === "b")?.status).toBe("synced");
  });

  it("stops draining on a repeat connectivity failure, leaving the item pending with attempts incremented", async () => {
    await enqueueSale(STORE_ID, makeSale("a"));
    mockedRpc.mockRejectedValue(new TypeError("Failed to fetch"));

    await drainQueue(STORE_ID);

    const all = await listQueuedSales(STORE_ID);
    expect(all[0]).toMatchObject({ status: "pending", attempts: 1 });
  });

  it("resumeAfterReauth updates the stuck item's cashier token and flips it back to pending", async () => {
    await enqueueSale(STORE_ID, makeSale("a", "stale-token"));
    mockedRpc.mockResolvedValueOnce({ data: null, error: { message: "EXPIRED_CASHIER_SESSION" } });
    await drainQueue(STORE_ID);
    expect((await listQueuedSales(STORE_ID))[0].status).toBe("needs_cashier_reauth");

    await resumeAfterReauth(STORE_ID, "fresh-token");

    const all = await listQueuedSales(STORE_ID);
    expect(all[0].status).toBe("pending");
    expect(all[0].payload.cashierToken).toBe("fresh-token");
  });
});
