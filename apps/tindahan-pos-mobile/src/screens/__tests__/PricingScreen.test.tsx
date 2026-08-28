import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { PricingScreen } from "../pricingscreen";
import { useBillingState } from "../../lib/billing";
import { supabase } from "../../lib/supabaseClient";

jest.mock("../../lib/billing", () => ({ useBillingState: jest.fn() }));
jest.mock("../../lib/supabaseClient", () => ({ supabase: { rpc: jest.fn() } }));

const mockedUseBillingState = useBillingState as jest.Mock;
const mockedRpc = supabase.rpc as jest.Mock;

const planPricesRows = [
  { plan_code: "BASIC", name: "Starter", price_php: 299, billing_interval: "MONTHLY", features: ["pos.sell"], sort_order: 1 },
  {
    plan_code: "BUSINESS",
    name: "Growth",
    price_php: 599,
    billing_interval: "MONTHLY",
    features: ["pos.sell", "pos.utang"],
    sort_order: 2,
  },
];
const featureRows = [
  { feature_code: "pos.sell", module_code: "POS", name: "Point of Sale", enabled: true },
  { feature_code: "pos.utang", module_code: "POS", name: "Utang tracking", enabled: false },
];

function mockRpcResponses(overrides: { billing?: unknown } = {}) {
  mockedUseBillingState.mockReturnValue(overrides.billing ?? null);
  mockedRpc.mockImplementation((name: string) => {
    if (name === "plan_prices") return Promise.resolve({ data: planPricesRows, error: null });
    if (name === "my_store_plan") return Promise.resolve({ data: [{ plan_code: "BASIC" }], error: null });
    if (name === "my_store_features") return Promise.resolve({ data: featureRows, error: null });
    return Promise.resolve({ data: null, error: null });
  });
}

describe("PricingScreen", () => {
  beforeEach(() => {
    mockedRpc.mockReset();
    mockRpcResponses();
  });

  it("renders every plan from plan_prices() with real feature names", async () => {
    render(<PricingScreen onBack={jest.fn()} />);
    expect(await screen.findByText("Starter")).toBeTruthy();
    expect(screen.getByText("Growth")).toBeTruthy();
    expect(screen.getByText("Utang tracking")).toBeTruthy();
  });

  it("disables the card for the plan the store is already on", async () => {
    render(<PricingScreen onBack={jest.fn()} />);
    expect(await screen.findByText("Current plan")).toBeTruthy();
  });

  it("starts a real trial when a trialable plan is chosen and the store hasn't used one", async () => {
    render(<PricingScreen onBack={jest.fn()} />);
    const growthButton = await screen.findByText("Choose Growth");
    fireEvent.press(growthButton);

    await waitFor(() => expect(mockedRpc).toHaveBeenCalledWith("start_trial", { p_plan_code: "BUSINESS" }));
    expect(await screen.findByText("Trial started")).toBeTruthy();
  });

  it("calls onBack when the back button is pressed", async () => {
    const onBack = jest.fn();
    render(<PricingScreen onBack={onBack} />);
    await screen.findByText("Starter");
    fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
