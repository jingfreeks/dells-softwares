import { describe, expect, it } from "vitest";
import { isConnectivityFailure } from "../classifyCheckoutError";

describe("isConnectivityFailure", () => {
  it("treats a thrown TypeError with no recognizable message as connectivity", () => {
    expect(isConnectivityFailure(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("treats a plain string error as connectivity", () => {
    expect(isConnectivityFailure("NetworkError when attempting to fetch resource.")).toBe(true);
  });

  it("treats an error with no message property as connectivity", () => {
    expect(isConnectivityFailure({})).toBe(true);
  });

  it("treats null/undefined as connectivity", () => {
    expect(isConnectivityFailure(null)).toBe(true);
    expect(isConnectivityFailure(undefined)).toBe(true);
  });

  it.each([
    "CREDIT_LIMIT_EXCEEDED",
    "INVALID_OVERRIDE_PIN",
    "OVERRIDE_PIN_LOCKED",
    "EXPIRED_CASHIER_SESSION",
    "INVALID_OCCURRED_AT",
    "INVALID_DISCOUNT_TYPE",
    "INVALID_DISCOUNT_VALUE",
    "Cart is empty",
    "A customer is required for a credit sale",
    "Max candy: Insufficient stock. Only 0 item(s) available.",
    "Duplicate product in cart — combine it into a single line with the total quantity",
  ])("treats known business-rule message %j as not a connectivity failure", (message) => {
    expect(isConnectivityFailure({ message })).toBe(false);
  });

  it("treats a Postgres error object carrying a known business-rule message as not connectivity", () => {
    expect(isConnectivityFailure({ code: "P0001", message: "CREDIT_LIMIT_EXCEEDED" })).toBe(false);
  });

  // The regression guard for the whole class. Six messages were added to the
  // whitelist above only after each one had already produced phantom sales in
  // production. This asserts a rejection nobody has ever heard of -- the exact
  // shape of the next migration's new `raise exception` -- is refused rather
  // than queued, without anyone having to remember to list it.
  it("does not queue a server rejection that is on no list anywhere", () => {
    expect(
      isConnectivityFailure({ code: "P0001", message: "SOME_RULE_INVENTED_NEXT_QUARTER" })
    ).toBe(false);
  });

  it("does not queue an RLS refusal", () => {
    expect(
      isConnectivityFailure({
        code: "42501",
        message: "new row violates row-level security policy for table \"sales\"",
      })
    ).toBe(false);
  });

  it("does not queue a PostgREST-level refusal such as an expired JWT", () => {
    expect(isConnectivityFailure({ code: "PGRST301", message: "JWT expired" })).toBe(false);
  });

  // The other half: errors that mean "could not finish right now" must still
  // queue, because the transaction rolled back and checkout_sale is idempotent
  // on client_request_id, so replaying is both safe and correct.
  it.each([
    ["08006", "connection_failure"],
    ["08003", "connection_does_not_exist"],
    ["53300", "too_many_connections"],
    ["40001", "serialization_failure"],
    ["40P01", "deadlock_detected"],
  ])("still queues %s (%s) for replay", (code, message) => {
    expect(isConnectivityFailure({ code, message })).toBe(true);
  });

  it("does not mistake a network-level code for a server decision", () => {
    expect(isConnectivityFailure({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" })).toBe(
      true
    );
  });

  it("defaults an unrecognized structured error message to connectivity", () => {
    expect(isConnectivityFailure({ code: "57014", message: "canceling statement due to statement timeout" })).toBe(
      true
    );
  });
});

describe("entitlement rejections are business rules, not connectivity", () => {
  // The failure this guards against loses a sale in a way nobody sees.
  // enforce_utang_feature() is a BEFORE INSERT trigger on `sales`, so a credit
  // sale from a store without pos.utang comes back out of checkout_sale() as
  // FEATURE_NOT_ENABLED. It was not on the whitelist, so it fell through to
  // the default -- "assume connectivity" -- and the sale was queued for
  // replay: retried forever against a server that refuses it every time, and
  // never surfaced to the cashier. A sale that cannot happen looked to them
  // like a sale that had.
  it("does not queue a credit sale the store is not entitled to make", () => {
    expect(isConnectivityFailure(new Error("FEATURE_NOT_ENABLED: pos.utang"))).toBe(false);
  });

  it("treats any withheld capability the same way", () => {
    expect(isConnectivityFailure(new Error("FEATURE_NOT_ENABLED: pos.void"))).toBe(false);
  });

  // Found live on staging: a >100% discount was rejected by checkout_sale()
  // with INVALID_DISCOUNT_VALUE, but that message wasn't on the whitelist --
  // so it fell through to "assume connectivity" and the sale was queued for
  // replay, shown to the cashier as a completed -₱50.00 sale with stock
  // already decremented, even though it can never actually sync (the server
  // rejects the same discount every retry).
  it("does not queue a sale rejected for an invalid discount", () => {
    expect(isConnectivityFailure(new Error("INVALID_DISCOUNT_VALUE"))).toBe(false);
    expect(isConnectivityFailure(new Error("INVALID_DISCOUNT_TYPE"))).toBe(false);
  });

  // The default still has to hold for everything genuinely unknown: wrongly
  // blocking a real offline sale is worse than queuing one twice, since
  // checkout_sale is idempotent on client_request_id.
  it("still assumes connectivity for an unrecognised failure", () => {
    expect(isConnectivityFailure(new Error("Failed to fetch"))).toBe(true);
  });
});

describe("a suspended store's refused sale is a business rule, not connectivity", () => {
  // guard_org_writes_allowed() (20260901160000) is a BEFORE INSERT trigger on
  // `sales`, so a refused sale comes back out of checkout_sale() the same way
  // FEATURE_NOT_ENABLED does. It reached production without being on this
  // whitelist, which meant the worst version of this bug: a suspended shop's
  // cashier would see completed sales, printed receipts and decremented
  // stock for transactions the server refuses on every retry -- money taken
  // for sales that do not exist.
  it("does not queue a sale the store is suspended from making", () => {
    expect(isConnectivityFailure(new Error("ORG_WRITES_SUSPENDED"))).toBe(false);
  });

  it("recognises it inside a wrapped Postgres error message", () => {
    expect(
      isConnectivityFailure({
        message: 'new row violates: ORG_WRITES_SUSPENDED',
        code: "P0001",
      })
    ).toBe(false);
  });
});

