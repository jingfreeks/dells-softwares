import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabaseClient";
import { enqueueSale, listQueuedSales, removeQueuedSale } from "../offlineQueue";
import { drainQueue, resumeAfterReauth } from "../syncEngine";

vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: vi.fn() } }));
const mockedRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

const STORE_ID = "store-1";

function makeSale(id: string, cashierToken: string | null = "tok-1", overridePin: string | null = null) {
  return {
    id,
    payload: {
      items: [{ product_id: "p1", quantity: 1 }],
      services: [],
      customerId: null,
      paymentType: "cash" as const,
      referenceNo: null,
      overridePin,
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

  // A queued over-limit credit sale carries the PIN the approver typed while
  // the device was offline. checkout_sale no longer accepts a raw PIN on the
  // replay path (20260903100000), because p_is_offline_replay is a plain
  // client-supplied boolean and the raw path was therefore an unlimited,
  // un-rate-limited guessing oracle reachable while online. The replay
  // exchanges the stored PIN for a token instead -- nobody is re-prompted.
  it("exchanges a stored override PIN for a token before replaying", async () => {
    await enqueueSale(STORE_ID, makeSale("s1", "tok-1", "1234"));
    mockedRpc.mockImplementation((fn: string) => {
      if (fn === "check_credit_override_pin") {
        return Promise.resolve({
          data: [{ ok: true, error_code: null, override_token: "override-token-1" }],
          error: null,
        });
      }
      return Promise.resolve({ data: [{ sale_id: "real-1", total: 9 }], error: null });
    });

    await drainQueue(STORE_ID);

    expect(mockedRpc).toHaveBeenCalledWith(
      "check_credit_override_pin",
      expect.objectContaining({ p_pin: "1234", p_cashier_token: "tok-1" })
    );
    expect(mockedRpc).toHaveBeenCalledWith(
      "checkout_sale",
      expect.objectContaining({ p_override_token: "override-token-1" })
    );
    const all = await listQueuedSales(STORE_ID);
    expect(all[0].status).toBe("synced");
  });

  it("fails the sale when the override PIN is locked out, without attempting the sale", async () => {
    await enqueueSale(STORE_ID, makeSale("s1", "tok-1", "9999"));
    mockedRpc.mockImplementation((fn: string) => {
      if (fn === "check_credit_override_pin") {
        return Promise.resolve({
          data: [{ ok: false, error_code: "OVERRIDE_PIN_LOCKED", override_token: null }],
          error: null,
        });
      }
      throw new Error("checkout_sale must not be attempted with an unvalidated override");
    });

    await drainQueue(STORE_ID);

    expect(mockedRpc).not.toHaveBeenCalledWith("checkout_sale", expect.anything());
    const all = await listQueuedSales(STORE_ID);
    expect(all[0].status).toBe("failed");
  });

  it("treats an expired cashier session during the exchange as needing reauth, not a failure", async () => {
    await enqueueSale(STORE_ID, makeSale("s1", "tok-1", "1234"));
    mockedRpc.mockImplementation((fn: string) => {
      if (fn === "check_credit_override_pin") {
        return Promise.resolve({
          data: [{ ok: false, error_code: "EXPIRED_CASHIER_SESSION", override_token: null }],
          error: null,
        });
      }
      throw new Error("checkout_sale must not be attempted");
    });

    await drainQueue(STORE_ID);

    const all = await listQueuedSales(STORE_ID);
    expect(all[0].status).toBe("needs_cashier_reauth");
  });

  // cashier_cash_out_cap (20260903200000) is enforced by checkout_sale summing
  // cash_handed_over across the sale's cash-out lines. A replay that dropped
  // service_type would leave the cap silently unenforced offline while working
  // online -- the same shape of divergence as the mobile cart.
  it("replays a cash-out line with the fields the cap is read from", async () => {
    await enqueueSale(STORE_ID, {
      ...makeSale("s1"),
      payload: {
        ...makeSale("s1").payload,
        services: [
          { label: "Cash out", amount: 500, fee: 10, service_type: "cashout", cash_handed_over: 500 },
        ],
      },
    });
    mockedRpc.mockResolvedValue({ data: [{ sale_id: "real-1", total: 510 }], error: null });

    await drainQueue(STORE_ID);

    expect(mockedRpc).toHaveBeenCalledWith(
      "checkout_sale",
      expect.objectContaining({
        p_services: [
          { label: "Cash out", amount: 500, fee: 10, service_type: "cashout", cash_handed_over: 500 },
        ],
      })
    );
  });

  // PostgREST usually rejects with an object carrying `message`, but a thrown
  // string reaches the same path -- and a sale whose failure reason came back
  // blank would be filed as "Sync failed." with nothing to act on.
  it("keeps a string rejection's text as the failure reason", async () => {
    await enqueueSale(STORE_ID, makeSale("s1"));
    mockedRpc.mockResolvedValue({ data: null, error: "CREDIT_LIMIT_EXCEEDED" });

    await drainQueue(STORE_ID);

    const all = await listQueuedSales(STORE_ID);
    expect(all[0].status).toBe("failed");
    expect(all[0].lastError).toBe("CREDIT_LIMIT_EXCEEDED");
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
