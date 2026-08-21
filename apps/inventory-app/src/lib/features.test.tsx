import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Exercised through the real ModulesProvider rather than by mocking
// useModules(): useHasFeature() reaches the context through its own
// module-internal reference, so a mocked export would not be the one it calls.
// Driving the provider also covers the my_store_features() row mapping, which
// is where a rename would actually break this.
const rpc = vi.fn();

vi.mock("./supabaseClient", () => ({ supabase: { rpc: (n: string) => rpc(n) } }));
vi.mock("./auth", () => ({ useAuth: () => ({ user: { id: "staff-1" } }) }));

const { ModulesProvider, useHasFeature } = await import("./modules");

function Probe({ code }: { code: string }) {
  return <span data-testid="answer">{useHasFeature(code) ? "yes" : "no"}</span>;
}

function reply(features: unknown[]) {
  rpc.mockImplementation((name: string) => {
    if (name === "my_store_features") return Promise.resolve({ data: features, error: null });
    if (name === "my_store_modules") return Promise.resolve({ data: [], error: null });
    return Promise.resolve({ data: [], error: null });
  });
}

const PO = {
  feature_code: "inventory.purchase_orders",
  module_code: "INVENTORY",
  name: "Purchase orders",
  enabled: false,
};
const SUPPLIERS = {
  feature_code: "inventory.suppliers",
  module_code: "INVENTORY",
  name: "Suppliers",
  enabled: true,
};

async function answer(code: string) {
  render(<ModulesProvider><Probe code={code} /></ModulesProvider>);
  // The first paint is the loading answer; wait for the fetch to settle.
  await waitFor(() => expect(rpc).toHaveBeenCalledWith("my_store_features"));
  return () => screen.getByTestId("answer").textContent;
}

beforeEach(() => {
  rpc.mockReset();
});

describe("useHasFeature", () => {
  it("says yes to a capability the plan includes", async () => {
    reply([SUPPLIERS, PO]);
    const read = await answer("inventory.suppliers");
    await waitFor(() => expect(read()).toBe("yes"));
  });

  it("says no to one the plan withholds", async () => {
    reply([SUPPLIERS, PO]);
    const read = await answer("inventory.purchase_orders");
    await waitFor(() => expect(read()).toBe("no"));
  });

  // The failure this guards against is a deploy-order accident: a client older
  // than the server's catalogue must not disable a capability merely because
  // it has not heard of it. useHasModule answers FALSE for an unknown module
  // and the difference is deliberate -- modules are a fixed, tiny set this app
  // knows by name, while the feature catalogue grows.
  it("says yes to a code it has never heard of", async () => {
    reply([SUPPLIERS]);
    const read = await answer("inventory.something_shipped_later");
    await waitFor(() => expect(read()).toBe("yes"));
  });

  // Presentation must never be the thing that stops someone working; the
  // database is the real boundary and refuses anything genuinely withheld.
  it("says yes when the read fails outright", async () => {
    rpc.mockImplementation((name: string) =>
      name === "my_store_features"
        ? Promise.resolve({ data: null, error: new Error("network") })
        : Promise.resolve({ data: [], error: null })
    );
    const read = await answer("inventory.purchase_orders");
    await waitFor(() => expect(read()).toBe("yes"));
  });
});
