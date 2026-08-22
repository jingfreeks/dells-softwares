import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SubscriptionCard } from "../SubscriptionCard";
import type { StoreFeature } from "@/lib/features/featuresContext";

const state: { catalogue: StoreFeature[] } = { catalogue: [] };

vi.mock("@/lib/features/featuresContext", async (orig) => ({
  ...(await orig<typeof import("@/lib/features/featuresContext")>()),
  useFeatures: () => ({
    features: new Set(state.catalogue.filter((f) => f.held).map((f) => f.code)),
    catalogue: state.catalogue,
    loading: false,
  }),
}));

vi.mock("@/lib/billing/billingContext", async (orig) => ({
  ...(await orig<typeof import("@/lib/billing/billingContext")>()),
  useBillingState: () => ({ organizationStatus: "ACTIVE", subscriptionStatus: "ACTIVE", writesAllowed: true, graceEndsAt: null }),
}));

const PLANS = [
  { plan_code: "BASIC", name: "Basic", price_php: 299, billing_interval: "MONTHLY", sort_order: 1, features: ["pos.utang"] },
  {
    plan_code: "BUSINESS",
    name: "Business",
    price_php: 599,
    billing_interval: "MONTHLY",
    sort_order: 2,
    features: ["pos.utang", "inventory.purchase_orders"],
  },
];

const rpc = vi.fn();
vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: (name: string) => rpc(name) } }));

function mockRpc({ myPlan = "BASIC" }: { myPlan?: string } = {}) {
  rpc.mockImplementation((name: string) => {
    if (name === "my_store_plan") {
      return Promise.resolve({
        data: [{ plan_code: myPlan, name: myPlan === "BASIC" ? "Basic" : "Business", price_php: myPlan === "BASIC" ? 299 : 599, billing_interval: "MONTHLY", features: [] }],
        error: null,
      });
    }
    if (name === "plan_prices") {
      return Promise.resolve({ data: PLANS, error: null });
    }
    return Promise.resolve({ data: [], error: null });
  });
}

function renderCard() {
  return render(
    <MemoryRouter>
      <SubscriptionCard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  rpc.mockReset();
});

describe("SubscriptionCard", () => {
  it("shows the store's current plan name and price", async () => {
    state.catalogue = [{ code: "pos.utang", moduleCode: "POS", name: "Utang (customer credit)", held: true }];
    mockRpc({ myPlan: "BASIC" });
    renderCard();
    expect(await screen.findByText("Basic")).toBeInTheDocument();
    expect(screen.getByText(/₱299\/monthly/)).toBeInTheDocument();
  });

  it("always offers a way to manage the subscription", async () => {
    state.catalogue = [{ code: "pos.utang", moduleCode: "POS", name: "Utang (customer credit)", held: true }];
    mockRpc();
    renderCard();
    expect(await screen.findByRole("link", { name: /manage subscription/i })).toHaveAttribute("href", "/settings/plan");
  });

  it("offers an upgrade CTA when the store is missing a feature, and opens the modal for the cheapest plan that unlocks it", async () => {
    state.catalogue = [
      { code: "pos.utang", moduleCode: "POS", name: "Utang (customer credit)", held: true },
      { code: "inventory.purchase_orders", moduleCode: "INVENTORY", name: "Purchase orders", held: false },
    ];
    mockRpc({ myPlan: "BASIC" });
    renderCard();
    const upgradeButton = await screen.findByRole("button", { name: /upgrade plan/i });

    await userEvent.click(upgradeButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to Business/)).toBeInTheDocument();
    expect(screen.getByText("Purchase orders")).toBeInTheDocument();
  });

  it("does not offer an upgrade CTA when the store already holds everything", async () => {
    state.catalogue = [{ code: "pos.utang", moduleCode: "POS", name: "Utang (customer credit)", held: true }];
    mockRpc({ myPlan: "BUSINESS" });
    renderCard();
    await screen.findByText("Business");
    expect(screen.queryByRole("button", { name: /upgrade plan/i })).not.toBeInTheDocument();
  });

  it("renders nothing while the current plan hasn't loaded, or if the store has none", async () => {
    state.catalogue = [];
    rpc.mockImplementation(() => new Promise(() => {}));
    const { container } = renderCard();
    expect(container).toBeEmptyDOMElement();
  });
});
