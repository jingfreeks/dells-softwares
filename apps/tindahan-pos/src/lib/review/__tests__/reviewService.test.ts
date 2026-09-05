import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchReviewSummary, fetchReviewHistory } from "../reviewService";
import { supabase } from "@/lib/supabaseClient";

vi.mock("@/lib/supabaseClient", () => ({ supabase: { rpc: vi.fn() } }));

const mockRpc = vi.mocked(supabase.rpc);

/** The RPC's shape, snake_case as Postgres returns it. */
const ROW = {
  period: { from: "2026-09-01", to: "2026-09-30" },
  overdue_days: 30,
  sales_total: "45280.00",
  transaction_count: 214,
  estimated_profit: "11420.00",
  profit_basis_share: "0.4000",
  inventory_value: "72400.00",
  inventory_basis_share: "1.0000",
  product_count: 120,
  low_stock_count: 12,
  out_of_stock_count: 2,
  slow_moving_count: 8,
  utang_outstanding: "8750.00",
  utang_overdue: "3200.00",
  customers_with_balance: 14,
  overdue_customer_count: 3,
  oldest_overdue_days: 21,
  best_sellers: [{ id: "p1", name: "Coca-Cola 1.5L", revenue: "12400.00", quantity: 210 }],
  daily_sales: [{ date: "2026-09-01", sales: "1200.00" }],
  shifts_closed: 2,
  shifts_off: 0,
  shifts_off_total: "0.00",
  overdue_customers: [{ id: "c1", name: "Juan Dela Cruz", balance: "1250.00", days_overdue: 21 }],
  previous: { from: "2026-08-01", to: "2026-08-31", sales_total: "41000.00", transaction_count: 190 },
};

describe("fetchReviewSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  // Postgres returns numerics as STRINGS over the wire. Every figure on the
  // dashboard is arithmetic, so a string that looks like a number would give
  // "45280.0041000.00" the moment anything added two of them.
  it("converts every numeric from the string Postgres actually sends", async () => {
    mockRpc.mockResolvedValue({ data: ROW, error: null } as never);

    const result = await fetchReviewSummary("2026-09-01", "2026-09-30");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.summary.salesTotal).toBe(45280);
    expect(result.summary.profitBasisShare).toBe(0.4);
    expect(result.summary.bestSellers[0].revenue).toBe(12400);
    expect(result.summary.dailySales[0].sales).toBe(1200);
    expect(result.summary.overdueCustomers[0].balance).toBe(1250);
    expect(result.summary.previous.salesTotal).toBe(41000);
  });

  it("omits the overdue argument entirely when none is given", async () => {
    mockRpc.mockResolvedValue({ data: ROW, error: null } as never);
    await fetchReviewSummary("2026-09-01", "2026-09-30");

    // Not `p_overdue_days: undefined` — the server reads the store's own
    // setting only when the key is absent, and a client default is what made
    // Review disagree with the Customers page.
    expect(mockRpc).toHaveBeenCalledWith("review_summary", {
      p_from: "2026-09-01",
      p_to: "2026-09-30",
    });
  });

  it("passes an explicit overdue threshold through when one is asked for", async () => {
    mockRpc.mockResolvedValue({ data: ROW, error: null } as never);
    await fetchReviewSummary("2026-09-01", "2026-09-30", 60);

    expect(mockRpc).toHaveBeenCalledWith("review_summary", {
      p_from: "2026-09-01",
      p_to: "2026-09-30",
      p_overdue_days: 60,
    });
  });

  // A refusal and a failure are different screens. Getting this backwards
  // tells a paying customer they have been downgraded.
  it("reads FEATURE_NOT_AVAILABLE as a refusal", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "FEATURE_NOT_AVAILABLE" } } as never);
    expect(await fetchReviewSummary("2026-09-01", "2026-09-30")).toEqual({ ok: false, refused: true });
  });

  it("reads UNAUTHORIZED_ACTION as a refusal too", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "UNAUTHORIZED_ACTION" } } as never);
    expect(await fetchReviewSummary("2026-09-01", "2026-09-30")).toEqual({ ok: false, refused: true });
  });

  it("treats anything else as a failure, not a refusal", async () => {
    // A dropped connection must not produce an upgrade prompt.
    mockRpc.mockResolvedValue({ data: null, error: { message: "network error" } } as never);
    expect(await fetchReviewSummary("2026-09-01", "2026-09-30")).toEqual({ ok: false, refused: false });
  });

  it("treats an empty payload as a failure", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null } as never);
    expect(await fetchReviewSummary("2026-09-01", "2026-09-30")).toEqual({ ok: false, refused: false });
  });

  it("survives a payload with empty collections", async () => {
    mockRpc.mockResolvedValue({
      data: { ...ROW, best_sellers: [], daily_sales: [], overdue_customers: [] },
      error: null,
    } as never);

    const result = await fetchReviewSummary("2026-09-01", "2026-09-30");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.bestSellers).toEqual([]);
    expect(result.summary.dailySales).toEqual([]);
  });
});

describe("fetchReviewHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps months, converting the numeric total", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { month: "2026-09", period_from: "2026-09-01", period_to: "2026-09-30", sales_total: "45280.00", transaction_count: 214 },
      ],
      error: null,
    } as never);

    const result = await fetchReviewHistory();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.months[0]).toEqual({
      month: "2026-09",
      from: "2026-09-01",
      to: "2026-09-30",
      salesTotal: 45280,
      transactionCount: 214,
    });
  });

  it("refuses the same way the summary does", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "FEATURE_NOT_AVAILABLE" } } as never);
    expect(await fetchReviewHistory()).toEqual({ ok: false, refused: true });
  });

  it("returns an empty list rather than failing when there are no months", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null } as never);
    const result = await fetchReviewHistory();
    expect(result).toEqual({ ok: true, months: [] });
  });
});
