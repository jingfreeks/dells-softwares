import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useFeatures, fetchReviewSummary } from "@/lib";
import type { ReviewSummary } from "@/lib";
import { Review } from "../Review";

vi.mock("@/lib/features/featuresContext", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useFeatures: vi.fn(),
}));
vi.mock("@/lib/review/reviewService", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchReviewSummary: vi.fn(),
}));

const mockUseFeatures = vi.mocked(useFeatures);
const mockFetch = vi.mocked(fetchReviewSummary);

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
  bestSellers: [],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/review"]}>
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/settings/plan" element={<p>Plan settings</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
