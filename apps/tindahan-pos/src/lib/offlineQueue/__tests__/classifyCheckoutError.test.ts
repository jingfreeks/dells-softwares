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
    "EXPIRED_CASHIER_SESSION",
    "INVALID_OCCURRED_AT",
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

  // The default still has to hold for everything genuinely unknown: wrongly
  // blocking a real offline sale is worse than queuing one twice, since
  // checkout_sale is idempotent on client_request_id.
  it("still assumes connectivity for an unrecognised failure", () => {
    expect(isConnectivityFailure(new Error("Failed to fetch"))).toBe(true);
  });
});
