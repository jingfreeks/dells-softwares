import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PlanSettings } from "../PlanSettings";
import type { StoreFeature } from "@/lib/features/featuresContext";

const state: { catalogue: StoreFeature[]; loading: boolean; writesAllowed: boolean } = {
  catalogue: [],
  loading: false,
  writesAllowed: true,
};

vi.mock("@/lib/features/featuresContext", async (orig) => ({
  ...(await orig<typeof import("@/lib/features/featuresContext")>()),
  useFeatures: () => ({
    features: new Set(state.catalogue.filter((f) => f.held).map((f) => f.code)),
    catalogue: state.catalogue,
    loading: state.loading,
  }),
}));

vi.mock("@/lib/billing/billingContext", async (orig) => ({
  ...(await orig<typeof import("@/lib/billing/billingContext")>()),
  useBillingState: () => ({
    organizationStatus: "ACTIVE",
    subscriptionStatus: state.writesAllowed ? "ACTIVE" : "SUSPENDED",
    writesAllowed: state.writesAllowed,
    graceEndsAt: null,
  }),
}));

// usePlanPage() calls plan_prices() directly through the client, rather than
// through a context -- it is page-specific, one-shot data, not something the
// whole app needs to gate on. useAddons() calls two more RPCs by name at the
// same seam. Routed by name here since the three calls need independent
// resolved values in the tests below.
const rpc = vi.fn();
vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: (name: string, args?: unknown) => rpc(name, args) } }));

const PLANS = [
  { plan_code: "FREE", name: "Free", price_php: 0, billing_interval: "MONTHLY", sort_order: 0, features: [] },
  {
    plan_code: "BASIC",
    name: "Basic",
    price_php: 299,
    billing_interval: "MONTHLY",
    sort_order: 1,
    features: ["pos.utang", "pos.eload", "inventory.suppliers"],
  },
  {
    plan_code: "BUSINESS",
    name: "Business",
    price_php: 599,
    billing_interval: "MONTHLY",
    sort_order: 2,
    features: ["pos.utang", "pos.eload", "inventory.suppliers", "inventory.purchase_orders"],
  },
  {
    plan_code: "ENTERPRISE",
    name: "Enterprise",
    price_php: null,
    billing_interval: "MONTHLY",
    sort_order: 4,
    features: [
      "pos.utang",
      "pos.eload",
      "inventory.suppliers",
      "inventory.purchase_orders",
      "inventory.transfers",
    ],
  },
];

const BASIC: StoreFeature[] = [
  { code: "pos.utang", moduleCode: "POS", name: "Utang (customer credit)", held: true },
  { code: "pos.eload", moduleCode: "POS", name: "E-load and cash-in", held: true },
  { code: "inventory.suppliers", moduleCode: "INVENTORY", name: "Suppliers", held: true },
  { code: "inventory.purchase_orders", moduleCode: "INVENTORY", name: "Purchase orders", held: false },
  { code: "inventory.transfers", moduleCode: "INVENTORY", name: "Stock transfers", held: false },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <PlanSettings />
    </MemoryRouter>
  );
}

beforeEach(() => {
  state.catalogue = BASIC;
  state.loading = false;
  state.writesAllowed = true;
  rpc.mockReset().mockImplementation((name: string) => {
    if (name === "plan_prices") return Promise.resolve({ data: PLANS, error: null });
    if (name === "current_store_has_module") return Promise.resolve({ data: true, error: null });
    if (name === "request_addon") return Promise.resolve({ data: null, error: null });
    return Promise.resolve({ data: null, error: null });
  });
});

describe("PlanSettings", () => {
  it("shows what the store holds", async () => {
    renderPage();
    expect(await screen.findByText("Utang (customer credit)")).toBeInTheDocument();
    expect(screen.getByText("Suppliers")).toBeInTheDocument();
  });

  // The whole point of the page. my_store_features() returns the entire
  // catalogue rather than only what is held precisely so a shopkeeper can see
  // what they are missing -- a tier nobody can see is a tier nobody buys.
  it("shows what the store does NOT hold, rather than hiding it", async () => {
    renderPage();
    expect(await screen.findByText("Purchase orders")).toBeInTheDocument();
    expect(screen.getByText("Stock transfers")).toBeInTheDocument();
    expect(screen.getByText(/Not in your plan/)).toBeInTheDocument();
  });

  it("groups what it HOLDS by module, so an upgrade is a sentence and not a list of codes", async () => {
    renderPage();
    await screen.findByText("Purchase orders");
    expect(screen.getAllByText("Selling").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stock and suppliers").length).toBeGreaterThan(0);
  });

  // The new behaviour plan_prices() exists for: a locked feature is grouped
  // under the cheapest plan that unlocks it, priced right there. Purchase
  // orders is BUSINESS's real differentiator in the fixture; stock transfers
  // is ENTERPRISE-only, so the two land in different groups with different
  // prices, not one flat "Not in your plan" list.
  it("groups what it does NOT hold by the cheapest plan that unlocks it, priced", async () => {
    renderPage();
    await screen.findByText("Purchase orders");

    expect(screen.getByText(/Upgrade to Business.*₱599/)).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to Enterprise.*Contact us/)).toBeInTheDocument();
  });

  it("says so plainly when nothing is withheld, instead of an empty panel", async () => {
    state.catalogue = BASIC.map((f) => ({ ...f, held: true }));
    renderPage();
    expect(await screen.findByText(/holds every capability/)).toBeInTheDocument();
    expect(screen.queryByText(/Not in your plan/)).not.toBeInTheDocument();
  });

  it("renders nothing until BOTH the features and the prices resolve", () => {
    state.loading = true;
    rpc.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.queryByText("Utang (customer credit)")).not.toBeInTheDocument();
    expect(screen.queryByText(/Not in your plan/)).not.toBeInTheDocument();
  });

  it("waits for prices specifically, even once features have already loaded", async () => {
    let settle: (v: unknown) => void = () => {};
    rpc.mockReturnValue(new Promise((r) => { settle = r; }));
    renderPage();

    // Features are ready; nothing renders yet because pricing is not.
    expect(screen.queryByText("Utang (customer credit)")).not.toBeInTheDocument();

    settle({ data: PLANS, error: null });
    expect(await screen.findByText("Utang (customer credit)")).toBeInTheDocument();
  });

  // §08: a suspended tenant is told writes are paused -- and told, in the same
  // breath, that nothing has been taken away. The page must never imply the
  // data is gone.
  it("explains a write pause without suggesting anything was lost", async () => {
    state.writesAllowed = false;
    renderPage();
    expect(await screen.findByText(/New records are paused/)).toBeInTheDocument();
    expect(screen.getByText(/still here, and still yours to read and export/)).toBeInTheDocument();
  });

  it("says nothing about billing while writes are allowed", async () => {
    renderPage();
    await screen.findByText("Utang (customer credit)");
    expect(screen.queryByText(/New records are paused/)).not.toBeInTheDocument();
  });
});

// Add-ons live on a different axis than the plan ladder -- get just
// Accounting, without upgrading the whole tier. Console-granted, not
// self-serve: the button records a request rather than turning anything on.
describe("PlanSettings add-ons card", () => {
  function mockHasAccounting(has: boolean) {
    rpc.mockImplementation((name: string) => {
      if (name === "plan_prices") return Promise.resolve({ data: PLANS, error: null });
      if (name === "current_store_has_module") return Promise.resolve({ data: has, error: null });
      if (name === "request_addon") return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    });
  }

  it("stays hidden once the store already holds the module", async () => {
    mockHasAccounting(true);
    renderPage();
    await screen.findByText("Utang (customer credit)");
    expect(screen.queryByText("Add-ons")).not.toBeInTheDocument();
  });

  it("offers the module once the store does not hold it", async () => {
    mockHasAccounting(false);
    renderPage();
    expect(await screen.findByText("Add-ons")).toBeInTheDocument();
    expect(screen.getByText("Accounting")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request add-on" })).toBeInTheDocument();
  });

  it("requests the add-on on click and shows it was requested, without touching entitlements itself", async () => {
    mockHasAccounting(false);
    const user = userEvent.setup();
    renderPage();

    const button = await screen.findByRole("button", { name: "Request add-on" });
    await user.click(button);

    expect(rpc).toHaveBeenCalledWith("request_addon", { p_module_code: "ACCOUNTING" });
    expect(await screen.findByText("Requested")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request add-on" })).not.toBeInTheDocument();
  });
});
