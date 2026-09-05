import { supabase } from "./supabaseClient";

/**
 * Review reads, mobile.
 *
 * A deliberate duplicate of the web app's src/lib/review — tindahan-pos-mobile
 * is excluded from the npm workspace on purpose (its own lockfile, Metro
 * resolution), so it cannot import from there. The shared packages/pos-core
 * question is parked; until it moves, this file and the web one have to be
 * kept in step by hand, and the RPC they both call is the thing that keeps
 * them honest: the figures are computed server-side, so neither client can
 * drift on the arithmetic, only on presentation.
 */

export interface ReviewBestSeller {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
}

export interface ReviewOverdueCustomer {
  id: string;
  name: string;
  balance: number;
  daysOverdue: number;
}

export interface ReviewSummary {
  salesTotal: number;
  transactionCount: number;
  /** Recomputed at today's cost -- sale_items never captured a snapshot. */
  estimatedProfit: number;
  /** Share of sold value with a known cost, 0-1. Never show the peso figure without it. */
  profitBasisShare: number;
  inventoryValue: number;
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  slowMovingCount: number;
  utangOutstanding: number;
  utangOverdue: number;
  customersWithBalance: number;
  overdueCustomerCount: number;
  oldestOverdueDays: number;
  bestSellers: ReviewBestSeller[];
  dailySales: { date: string; sales: number }[];
  shiftsClosed: number;
  shiftsOff: number;
  shiftsOffTotal: number;
  overdueCustomers: ReviewOverdueCustomer[];
  previous: { from: string; to: string; salesTotal: number };
}

export type FetchReviewResult =
  | { ok: true; summary: ReviewSummary }
  | { ok: false; refused: boolean };

/**
 * `refused` separates "your plan does not include this" from "something went
 * wrong". They are different screens, and showing an upgrade prompt after a
 * dropped connection would tell a paying customer they had been downgraded.
 */
export async function fetchReviewSummary(from: string, to: string): Promise<FetchReviewResult> {
  const { data, error } = await supabase.rpc("review_summary", { p_from: from, p_to: to });

  if (error) {
    const refused =
      error.message?.includes("FEATURE_NOT_AVAILABLE") ||
      error.message?.includes("UNAUTHORIZED_ACTION");
    return { ok: false, refused: Boolean(refused) };
  }
  if (!data) return { ok: false, refused: false };

  const row = data;
  return {
    ok: true,
    summary: {
      salesTotal: Number(row.sales_total),
      transactionCount: row.transaction_count,
      estimatedProfit: Number(row.estimated_profit),
      profitBasisShare: Number(row.profit_basis_share),
      inventoryValue: Number(row.inventory_value),
      productCount: row.product_count,
      lowStockCount: row.low_stock_count,
      outOfStockCount: row.out_of_stock_count,
      slowMovingCount: row.slow_moving_count,
      utangOutstanding: Number(row.utang_outstanding),
      utangOverdue: Number(row.utang_overdue),
      customersWithBalance: row.customers_with_balance,
      overdueCustomerCount: row.overdue_customer_count,
      oldestOverdueDays: row.oldest_overdue_days,
      bestSellers: (row.best_sellers ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        revenue: Number(b.revenue),
        quantity: b.quantity,
      })),
      dailySales: (row.daily_sales ?? []).map((d) => ({ date: d.date, sales: Number(d.sales) })),
      shiftsClosed: row.shifts_closed,
      shiftsOff: row.shifts_off,
      shiftsOffTotal: Number(row.shifts_off_total),
      overdueCustomers: (row.overdue_customers ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        balance: Number(c.balance),
        daysOverdue: c.days_overdue,
      })),
      previous: {
        from: row.previous.from,
        to: row.previous.to,
        salesTotal: Number(row.previous.sales_total),
      },
    },
  };
}

/**
 * This month in Manila, matching how review_summary() bounds a period.
 *
 * Offset arithmetic rather than Intl, for the reason format.ts's manilaParts()
 * gives at length: these tests run on Node's full ICU while the app runs on
 * Hermes, which has known time-zone gaps on device and no polyfill here. This
 * value becomes the PERIOD SENT TO THE SERVER, so getting it wrong asks for
 * the wrong month's figures — a silent wrong answer rather than a visible
 * failure.
 */
export function thisMonthPeriod(now: Date = new Date()): { from: string; to: string } {
  const manila = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = manila.getUTCFullYear();
  const month = manila.getUTCMonth() + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` };
}

/**
 * One month there is something to review.
 *
 * Derived, never stored — Product Decisions §3 rules out a reviews table and
 * any invented "reviewed" state, so there is no status here. The mobile
 * mockup shows a "Reviewed" chip on each row; it is dropped for the same
 * reason the web dropped it: nothing sets it, so it would be the same word on
 * every row forever.
 */
export interface ReviewHistoryMonth {
  month: string;
  from: string;
  to: string;
  salesTotal: number;
}

export async function fetchReviewHistory(
  limit = 6
): Promise<{ ok: true; months: ReviewHistoryMonth[] } | { ok: false }> {
  const { data, error } = await supabase.rpc("review_history", { p_limit: limit });
  if (error || !data) return { ok: false };
  return {
    ok: true,
    months: data.map((row) => ({
      month: row.month,
      from: row.period_from,
      to: row.period_to,
      salesTotal: Number(row.sales_total),
    })),
  };
}

/** "2026-09" → "September 2026", in the app's pinned locale and zone. */
export function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, m - 1, 15)));
}
