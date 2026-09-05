import { render, screen, waitFor } from "@testing-library/react-native";
import { ReviewScreen } from "../ReviewScreen";

const mockUseFeatureState = jest.fn();
const mockFetchReviewSummary = jest.fn();
const mockFetchReviewHistory = jest.fn();

jest.mock("../../../lib/features", () => ({
  useFeatureState: (code: string) => mockUseFeatureState(code),
}));
// Mocked outright rather than requireActual: the real module imports
// supabaseClient, which reads env config at import time and is not what these
// tests are about.
jest.mock("../../../lib/review", () => ({
  fetchReviewSummary: (...args: unknown[]) => mockFetchReviewSummary(...args),
  fetchReviewHistory: (...args: unknown[]) => mockFetchReviewHistory(...args),
  thisMonthPeriod: () => ({ from: "2026-09-01", to: "2026-09-30" }),
  monthLabel: (m: string) => m,
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
      onViewLowStock={jest.fn()}
      onViewOverdue={jest.fn()}
      {...props}
    />
  );
}

describe("ReviewScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Every entitled render loads history alongside the summary.
    mockFetchReviewHistory.mockResolvedValue({ ok: true, months: [] });
  });

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

  it("lists what needs attention, and only what is true", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderScreen();

    expect(await screen.findByText("12 products are low on stock")).toBeTruthy();
    expect(screen.getByText("3 customers have overdue utang")).toBeTruthy();
    expect(screen.getByText("Oldest balance: 21 days")).toBeTruthy();
    expect(screen.getByText("8 products have not sold recently")).toBeTruthy();
  });

  it("shows only the good-news row when nothing needs attention", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({
      ok: true,
      summary: { ...SUMMARY, lowStockCount: 0, overdueCustomerCount: 0, slowMovingCount: 0 },
    });
    renderScreen();

    // A quiet store should not be handed a list of non-problems.
    expect(await screen.findByText("Cashier shifts are balanced")).toBeTruthy();
    expect(screen.queryByText(/low on stock/)).toBeNull();
    expect(screen.queryByText(/overdue utang/)).toBeNull();
  });

  // The state that would ship quietly wrong: an uncounted drawer has nothing
  // to be off by, and calling it balanced turns "nobody checked" into "nothing
  // to check".
  it("does not report an uncounted drawer as balanced", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({
      ok: true,
      summary: { ...SUMMARY, shiftsClosed: 0, shiftsOff: 0 },
    });
    renderScreen();

    expect(await screen.findByText("No shifts were counted")).toBeTruthy();
    expect(screen.queryByText("Cashier shifts are balanced")).toBeNull();
  });

  it("flags a drawer that is out", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({
      ok: true,
      summary: { ...SUMMARY, shiftsClosed: 4, shiftsOff: 1, shiftsOffTotal: 60 },
    });
    renderScreen();

    expect(await screen.findByText("1 of 4 shifts off by more than your limit")).toBeTruthy();
  });

  it("names the customers to chase", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({
      ok: true,
      summary: {
        ...SUMMARY,
        overdueCustomers: [{ id: "c1", name: "Juan Dela Cruz", balance: 1250, daysOverdue: 21 }],
      },
    });
    renderScreen();

    expect(await screen.findByText("Juan Dela Cruz")).toBeTruthy();
    expect(screen.getByText("21 days overdue")).toBeTruthy();
  });

  it("summarises stock health in a sentence", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderScreen();

    // 120 products, 12 low, 2 out, 8 slow -> 98 healthy, which rounds to 82%.
    expect(await screen.findByText(/82% healthy · 14 products need restocking soon/)).toBeTruthy();
  });

  // Product Decisions §3: nothing sets a reviewed state, so nothing may claim
  // one. The mobile mockup shows the chip on every row; it is dropped.
  it("lists history months with no invented \"Reviewed\" status", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: true, summary: SUMMARY });
    mockFetchReviewHistory.mockResolvedValue({
      ok: true,
      months: [{ month: "2026-09", from: "2026-09-01", to: "2026-09-30", salesTotal: 45280 }],
    });
    renderScreen();

    expect(await screen.findByText("2026-09")).toBeTruthy();
    expect(screen.queryByText("Reviewed")).toBeNull();
  });

  // History is a nice-to-have beside the metrics; losing it must not lose the
  // screen.
  it("still shows the review when history fails to load", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: true, summary: SUMMARY });
    mockFetchReviewHistory.mockResolvedValue({ ok: false });
    renderScreen();

    expect(await screen.findByText("Sales")).toBeTruthy();
    expect(screen.getByText(/A month appears here once/)).toBeTruthy();
  });

  it("shows a plain error, with no server wording", async () => {
    mockUseFeatureState.mockReturnValue(true);
    mockFetchReviewSummary.mockResolvedValue({ ok: false, refused: false });
    renderScreen();

    expect(await screen.findByText("We couldn't load your review")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });
});
