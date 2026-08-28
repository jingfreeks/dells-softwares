import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pricing } from "../Pricing";

const rpc = vi.fn();
vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: (...args: unknown[]) => rpc(...args) } }));

const useBillingState = vi.fn();
vi.mock("@/lib/billing/billingContext", () => ({ useBillingState: () => useBillingState() }));

const planPricesRows = [
  { plan_code: "BASIC", name: "Starter", price_php: 299, billing_interval: "MONTHLY", features: ["a"], sort_order: 1 },
  { plan_code: "BUSINESS", name: "Growth", price_php: 599, billing_interval: "MONTHLY", features: ["a", "b"], sort_order: 2 },
  { plan_code: "ENTERPRISE", name: "Business", price_php: null, billing_interval: "MONTHLY", features: ["a", "b", "c"], sort_order: 3 },
];

beforeEach(() => {
  useBillingState.mockReturnValue({
    organizationStatus: "ACTIVE",
    subscriptionStatus: "ACTIVE",
    writesAllowed: true,
    graceEndsAt: null,
    trialEndsAt: null,
  });
  rpc.mockReset().mockImplementation((name: string) => {
    if (name === "plan_prices") return Promise.resolve({ data: planPricesRows, error: null });
    if (name === "my_store_plan") return Promise.resolve({ data: [{ plan_code: "BASIC" }], error: null });
    return Promise.resolve({ data: null, error: null });
  });
});

describe("Pricing", () => {
  it("renders every plan from plan_prices()", async () => {
    render(<Pricing />);
    expect(await screen.findByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
  });

  it("disables the card for the plan the store is already on", async () => {
    render(<Pricing />);
    const starterButton = await screen.findByRole("button", { name: "Current plan" });
    expect(starterButton).toBeDisabled();
  });

  it("starts a real trial when a trialable plan is chosen and the store hasn't used one", async () => {
    const user = userEvent.setup();
    render(<Pricing />);
    const growthButton = await screen.findByRole("button", { name: "Start free trial" });
    await user.click(growthButton);

    expect(rpc).toHaveBeenCalledWith("start_trial", { p_plan_code: "BUSINESS" });
    expect(await screen.findByRole("button", { name: "Trial started" })).toBeInTheDocument();
  });

  it("does not offer a self-serve trial once the store has already used one", async () => {
    useBillingState.mockReturnValue({
      organizationStatus: "ACTIVE",
      subscriptionStatus: "ACTIVE",
      writesAllowed: true,
      graceEndsAt: null,
      trialEndsAt: "2026-01-01T00:00:00Z",
    });
    render(<Pricing />);
    await screen.findByText("Growth");
    expect(screen.queryByRole("button", { name: "Start free trial" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ask about this plan" }).length).toBeGreaterThan(0);
  });
});
