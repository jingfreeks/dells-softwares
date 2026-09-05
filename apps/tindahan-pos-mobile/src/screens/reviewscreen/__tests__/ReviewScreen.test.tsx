import { render, screen, waitFor } from "@testing-library/react-native";
import { ReviewScreen } from "../ReviewScreen";

const mockUseFeatureState = jest.fn();
const mockFetchReviewSummary = jest.fn();

jest.mock("../../../lib/features", () => ({
  useFeatureState: (code: string) => mockUseFeatureState(code),
}));
// Mocked outright rather than requireActual: the real module imports
// supabaseClient, which reads env config at import time and is not what these
// tests are about.
jest.mock("../../../lib/review", () => ({
  fetchReviewSummary: (...args: unknown[]) => mockFetchReviewSummary(...args),
  thisMonthPeriod: () => ({ from: "2026-09-01", to: "2026-09-30" }),
}));

const SUMMARY = {
  salesTotal: 45280,
  transactionCount: 214,
  estimatedProfit: 11420,
  profitBasisShare: 1,
  inventoryValue: 72400,
  productCount: 120,
  lowStockCount: 12,
  outOfStockCount: 2,
  slowMovingCount: 8,
  utangOutstanding: 8750,
  utangOverdue: 3200,
  customersWithBalance: 14,
  overdueCustomerCount: 3,
  oldestOverdueDays: 21,
  bestSellers: [],
  dailySales: [],
  shiftsClosed: 2,
  shiftsOff: 0,
  shiftsOffTotal: 0,
  overdueCustomers: [],
  previous: { from: "2026-08-01", to: "2026-08-31", salesTotal: 41000 },
};

function renderScreen(props: Partial<React.ComponentProps<typeof ReviewScreen>> = {}) {
  return render(
    <ReviewScreen
      activeTab="home"
      onChangeTab={jest.fn()}
      onBack={jest.fn()}
      onUpgrade={jest.fn()}
      {...props}
    />
  );
}

describe("ReviewScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  // The mandatory security matrix, at the mobile UI layer. The server enforces
  // it too; this asserts the client does not even ask.
  it("shows the upgrade state to a store without the entitlement, and requests nothing", async () => {
    mockUseFeatureState.mockReturnValue(false);
    renderScreen();

    expect(await screen.findByText("Review is available with Growth")).toBeTruthy();
    expect(screen.getByText("Upgrade to Growth")).toBeTruthy();
    expect(mockFetchReviewSummary).not.toHaveBeenCalled();
  });

  // null means "still loading". Guessing either way is wrong: entitled flashes
  // real figures at a Starter store, locked tells a paying one it was
  // downgraded.
  it("waits rather than guessing while the entitlement is unknown", () => {
    mockUseFeatureState.mockReturnValue(null);
    renderScreen();

    expect(screen.queryByText("Review is available with Growth")).toBeNull();
    expect(mockFetchReviewSummary).not.toHaveBeenCalled();
  });

  it("renders the metrics for an entitled store", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderScreen();

    expect(await screen.findByText("Sales")).toBeTruthy();
    expect(screen.getByText("Est. profit")).toBeTruthy();
    expect(screen.getByText("3 overdue")).toBeTruthy();
    expect(screen.getByText("12 low stock")).toBeTruthy();
  });

  // No expenses table exists, review_summary() omits the key, and a pgTAP
  // assertion keeps it omitted — so the card must not exist rather than show 0.
  it("does not render an Expenses metric", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderScreen();

    await screen.findByText("Sales");
    expect(screen.queryByText("Expenses")).toBeNull();
  });

  it("says the profit figure is estimated even at full cost coverage", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderScreen();

    // Current cost is not cost-at-sale, so complete coverage still is not exact.
    expect(await screen.findByText(/estimated/i)).toBeTruthy();
  });

  it("withholds the profit figure when nothing has a cost", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({
      ok: true,
      summary: { ...SUMMARY, estimatedProfit: 0, profitBasisShare: 0 },
    });
    renderScreen();

    expect(await screen.findByText("No product costs recorded yet")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("falls back to the upgrade state when the server refuses", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: false, refused: true });
    renderScreen();

    // Client and server disagreeing about the plan is settled by the server.
    await waitFor(() => expect(screen.getByText("Review is available with Growth")).toBeTruthy());
  });

  it("shows a plain error, with no server wording", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: false, refused: false });
    renderScreen();

    expect(await screen.findByText("We couldn't load your review")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });
});
