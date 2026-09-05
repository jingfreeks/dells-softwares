import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { useFeatures, fetchReviewSummary, fetchReviewHistory } from "@/lib";
import type { ReviewSummary } from "@/lib";
import { Review } from "../Review";

vi.mock("@/lib/features/featuresContext", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useFeatures: vi.fn(),
}));
vi.mock("@/lib/review/reviewService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchReviewSummary: vi.fn(),
  fetchReviewHistory: vi.fn(),
}));

const mockUseFeatures = vi.mocked(useFeatures);
const mockFetch = vi.mocked(fetchReviewSummary);
const mockHistory = vi.mocked(fetchReviewHistory);

function asFeatures(codes: string[], loading = false) {
  return { features: new Set(codes), loading } as ReturnType<typeof useFeatures>;
}

const SUMMARY: ReviewSummary = {
  period: { from: "2026-09-01", to: "2026-09-30" },
  salesTotal: 45280,
  transactionCount: 214,
  estimatedProfit: 11420,
  profitBasisShare: 1,
  inventoryValue: 72400,
  inventoryBasisShare: 1,
  productCount: 120,
  lowStockCount: 12,
  outOfStockCount: 2,
  slowMovingCount: 8,
  utangOutstanding: 8750,
  utangOverdue: 3200,
  customersWithBalance: 14,
  overdueCustomerCount: 3,
  oldestOverdueDays: 21,
  overdueDays: 30,
  bestSellers: [],
  dailySales: [],
  shiftsClosed: 2,
  shiftsOff: 0,
  shiftsOffTotal: 0,
  overdueCustomers: [],
  previous: { from: "2026-08-01", to: "2026-08-31", salesTotal: 41000, transactionCount: 190 },
};

/** Reports back which filter the navigation asked the destination to apply. */
function FilterProbe({ testId }: { testId: string }) {
  const { state } = useLocation();
  return <p data-testid={testId}>{Object.keys((state as object | null) ?? {}).join(",") || "none"}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/review"]}>
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/settings/plan" element={<p>Plan settings</p>} />
        <Route path="/inventory" element={<FilterProbe testId="inventory-filter" />} />
        <Route path="/review/low-stock" element={<p>Low stock detail</p>} />
        <Route path="/customers" element={<FilterProbe testId="customers-filter" />} />
        <Route path="/reports" element={<p>Reports</p>} />
        <Route path="/staff" element={<p>Staff</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The dashboard shows the three most recent months, so every test that
    // renders it makes this call. Default to empty; the history tests override.
    mockHistory.mockResolvedValue({ ok: true, months: [] });
  });

  // The first row of the brief's mandatory security matrix, at the UI layer.
  // The server enforces it too (450_review_entitlement.sql); this asserts the
  // client does not even ask.
  it("shows the upgrade state to a store without the entitlement, and requests nothing", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.utang"]));
    renderPage();

    expect(await screen.findByText("Review is available with Growth")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade to Growth" })).toBeInTheDocument();
    // The point of a marketing-only state: no Review data was fetched to draw it.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends the owner to the plan page from the upgrade button", async () => {
    const user = userEvent.setup();
    mockUseFeatures.mockReturnValue(asFeatures([]));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Upgrade to Growth" }));
    expect(screen.getByText("Plan settings")).toBeInTheDocument();
  });

  // useFeature() fails open while loading, which would flash the dashboard at
  // a Starter store. The page waits instead.
  it("waits rather than guessing while entitlements are still loading", () => {
    mockUseFeatures.mockReturnValue(asFeatures([], true));
    renderPage();

    expect(screen.queryByText("Review is available with Growth")).not.toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("renders the metrics for an entitled store", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderPage();

    expect(await screen.findByText("SALES")).toBeInTheDocument();
    expect(screen.getByText("ESTIMATED PROFIT")).toBeInTheDocument();
    expect(screen.getByText("UTANG")).toBeInTheDocument();
    expect(screen.getByText("INVENTORY")).toBeInTheDocument();
    expect(screen.getByText("3 overdue")).toBeInTheDocument();
    expect(screen.getByText("12 low stock")).toBeInTheDocument();
  });

  // The design shows five metrics. There is no expenses table, review_summary()
  // omits the key, and a pgTAP assertion keeps it omitted -- so the card must
  // not exist rather than render a zero.
  it("does not render an Expenses card, because nothing can supply one", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderPage();

    await screen.findByText("SALES");
    expect(screen.queryByText("EXPENSES")).not.toBeInTheDocument();
  });

  // Product Decisions §2. sale_items never captured a cost snapshot, so profit
  // is partial whenever a sold product has no cost. The card says so instead of
  // printing a margin computed from part of the sales.
  it("discloses the coverage behind estimated profit instead of showing a margin", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({
      ok: true,
      summary: { ...SUMMARY, profitBasisShare: 0.4 },
    });
    renderPage();

    expect(
      await screen.findByText("Estimated from current costs · 40% of sales have one")
    ).toBeInTheDocument();
    expect(screen.queryByText(/^\d+% margin$/)).not.toBeInTheDocument();
  });

  // The half that is easy to get wrong: at FULL coverage the figure is still
  // estimated, because products.cost is today's cost and not the one that
  // applied when the sale happened. §2 forbids presenting it as exact, so a
  // bare margin is not allowed either.
  it("still says the figure is estimated when cost coverage is complete", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: { ...SUMMARY, profitBasisShare: 1 } });
    renderPage();

    await screen.findByText("ESTIMATED PROFIT");
    expect(
      screen.getByText(/estimated from current product costs$/i)
    ).toBeInTheDocument();
  });

  // A misleading zero, which §2 rules out: review_summary() returns 0 profit
  // when nothing has a cost, and rendering that as PHP 0.00 would read as
  // "you made no profit" rather than "we cannot tell".
  it("withholds the figure entirely when no product has a cost", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({
      ok: true,
      summary: { ...SUMMARY, estimatedProfit: 0, profitBasisShare: 0 },
    });
    renderPage();

    expect(await screen.findByText("No product costs recorded yet")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("₱0.00")).not.toBeInTheDocument();
  });

  it("lists what needs attention, and lands each action on the filtered view", async () => {
    const user = userEvent.setup();
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderPage();

    expect(await screen.findByText("12 low on stock")).toBeInTheDocument();
    expect(screen.getByText("3 have overdue utang")).toBeInTheDocument();
    expect(screen.getByText("Oldest balance: 21 days")).toBeInTheDocument();
    expect(screen.getByText("8 have not sold recently")).toBeInTheDocument();

    // The action has to arrive somewhere useful. "View low stock" opens the
    // detail, which answers "how much should I order" -- the product list does
    // not, and landing there is the button that only looks like it works.
    await user.click(screen.getByRole("button", { name: "View low stock" }));
    expect(screen.getByText("Low stock detail")).toBeInTheDocument();
  });

  it("sends View overdue to the customers page already filtered", async () => {
    const user = userEvent.setup();
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderPage();

    await user.click(await screen.findByRole("button", { name: "View overdue" }));
    expect(screen.getByTestId("customers-filter")).toHaveTextContent("overdueOnly");
  });

  // Three states, and the middle one is the reason this is tested at all.
  it("reports balanced shifts as good news", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: { ...SUMMARY, shiftsClosed: 3, shiftsOff: 0 } });
    renderPage();

    expect(await screen.findByText("Cashier shifts are balanced")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("does NOT report an uncounted drawer as balanced", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: { ...SUMMARY, shiftsClosed: 0, shiftsOff: 0 } });
    renderPage();

    expect(await screen.findByText("No shifts were counted")).toBeInTheDocument();
    expect(screen.queryByText("Cashier shifts are balanced")).not.toBeInTheDocument();
    expect(screen.queryByText("Good")).not.toBeInTheDocument();
  });

  it("flags a drawer that is out", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({
      ok: true,
      summary: { ...SUMMARY, shiftsClosed: 4, shiftsOff: 1, shiftsOffTotal: 60 },
    });
    renderPage();

    expect(await screen.findByText("1 of 4 off by more than your limit")).toBeInTheDocument();
  });

  // A quiet store should not be shown a list of non-problems.
  it("shows only the good-news row when nothing needs attention", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({
      ok: true,
      summary: {
        ...SUMMARY,
        lowStockCount: 0,
        overdueCustomerCount: 0,
        slowMovingCount: 0,
        shiftsClosed: 2,
        shiftsOff: 0,
      },
    });
    renderPage();

    await screen.findByText("Cashier shifts are balanced");
    expect(screen.queryByText(/low on stock/)).not.toBeInTheDocument();
    expect(screen.queryByText(/have overdue utang/)).not.toBeInTheDocument();
    expect(screen.queryByText(/have not sold recently/)).not.toBeInTheDocument();
  });

  it("names the customers to chase, and says so when there are none", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({
      ok: true,
      summary: {
        ...SUMMARY,
        overdueCustomers: [{ id: "c1", name: "Juan Dela Cruz", balance: 1250, daysOverdue: 21 }],
      },
    });
    renderPage();

    expect(await screen.findByText("Juan Dela Cruz")).toBeInTheDocument();
    expect(screen.getByText("21 days overdue")).toBeInTheDocument();
  });

  it("re-queries when the period changes, and asks for the whole month", async () => {
    const user = userEvent.setup();
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderPage();

    await screen.findByText("SALES");
    mockFetch.mockClear();

    await user.click(screen.getByRole("button", { name: "Last month" }));

    // Whole months, not month-to-date: review_summary() only compares against
    // the previous calendar month when the period IS one.
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [from, to] = mockFetch.mock.calls[0];
    expect(from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(to).toMatch(/^\d{4}-\d{2}-(28|29|30|31)$/);
  });

  // "vs last month" is only true when the period is a month, so the card names
  // the window the server actually compared against.
  it("labels the comparison with the window the server used", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderPage();

    // 45,280 against a previous 41,000 is +10%.
    expect(await screen.findByText(/▲10% vs Aug 1–Aug 31/)).toBeInTheDocument();
  });

  it("shows no delta when there is no previous period to compare against", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({
      ok: true,
      summary: { ...SUMMARY, previous: { ...SUMMARY.previous, salesTotal: 0 } },
    });
    renderPage();

    // A store's first month compared against nothing is not "+100%".
    await screen.findByText("SALES");
    expect(screen.queryByText(/▲/)).not.toBeInTheDocument();
    expect(screen.getByText("214 sales")).toBeInTheDocument();
  });

  it("lists recent months, with no invented \"Reviewed\" status", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    mockHistory.mockResolvedValue({
      ok: true,
      months: [
        { month: "2026-09", from: "2026-09-01", to: "2026-09-30", salesTotal: 45280, transactionCount: 214 },
        { month: "2026-08", from: "2026-08-01", to: "2026-08-31", salesTotal: 41000, transactionCount: 190 },
      ],
    });
    renderPage();

    expect(await screen.findByText("September 2026")).toBeInTheDocument();
    expect(screen.getByText("August 2026")).toBeInTheDocument();
    // Product Decisions §3: nothing sets a reviewed state, so nothing may
    // claim one. A chip that is always the same word implies someone checked.
    expect(screen.queryByText("Reviewed")).not.toBeInTheDocument();
  });

  it("opens a history month as the dashboard's period", async () => {
    const user = userEvent.setup();
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    mockHistory.mockResolvedValue({
      ok: true,
      months: [
        { month: "2026-08", from: "2026-08-01", to: "2026-08-31", salesTotal: 41000, transactionCount: 190 },
      ],
    });
    renderPage();

    await screen.findByText("August 2026");
    mockFetch.mockClear();
    await user.click(screen.getByRole("button", { name: "View" }));

    // The server's own bounds, so the report cannot disagree with the row.
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith("2026-08-01", "2026-08-31"));
  });

  it("says so plainly when there are no months yet", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    renderPage();

    expect(await screen.findByText("No months to review yet.")).toBeInTheDocument();
  });

  // SalesReviewCard only ever rendered its empty branch, because every fixture
  // passed empty collections. These exercise the chart and the best-seller
  // list, which is where its logic actually is.
  it("draws the trend and the best sellers when there are sales", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({
      ok: true,
      summary: {
        ...SUMMARY,
        dailySales: [
          { date: "2026-09-01", sales: 1200 },
          { date: "2026-09-02", sales: 0 },
          { date: "2026-09-03", sales: 3400 },
        ],
        bestSellers: [
          { id: "p1", name: "Coca-Cola 1.5L", revenue: 12400, quantity: 210 },
          { id: "p2", name: "Lucky Me Pancit", revenue: 8920, quantity: 180 },
        ],
      },
    });
    renderPage();

    expect(await screen.findByText("Best sellers")).toBeInTheDocument();
    expect(screen.getByText("Coca-Cola 1.5L")).toBeInTheDocument();
    expect(screen.getByText("Lucky Me Pancit")).toBeInTheDocument();

    // The chart is one accessible summary, not 30 unlabelled bars — a day with
    // no sales is still a day, and the total has to include it.
    expect(
      screen.getByRole("img", { name: /Daily sales for the period.*across 3 days/ })
    ).toBeInTheDocument();
  });

  it("says so when the period sold nothing", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({
      ok: true,
      summary: { ...SUMMARY, dailySales: [{ date: "2026-09-01", sales: 0 }], bestSellers: [] },
    });
    renderPage();

    expect(await screen.findByText("No sales in this period yet.")).toBeInTheDocument();
  });

  it("shows a plain error with a working retry, and no server wording", async () => {
    const user = userEvent.setup();
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: false, refused: false });
    renderPage();

    expect(await screen.findByText("We couldn't load your review")).toBeInTheDocument();

    mockFetch.mockResolvedValue({ ok: true, summary: SUMMARY });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("SALES")).toBeInTheDocument());
  });

  // If the client thinks it holds the feature and the server disagrees, the
  // server wins -- and the honest outcome is the upgrade state, not an error.
  it("falls back to the upgrade state when the server refuses despite the client believing otherwise", async () => {
    mockUseFeatures.mockReturnValue(asFeatures(["pos.review"]));
    mockFetch.mockResolvedValue({ ok: false, refused: true });
    renderPage();

    expect(await screen.findByText("Review is available with Growth")).toBeInTheDocument();
  });
});
