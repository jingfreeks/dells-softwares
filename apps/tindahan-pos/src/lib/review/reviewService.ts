import { supabase } from "@/lib/supabaseClient";
import type { ReviewSummary, ReviewBestSeller } from "./reviewTypes";

/**
 * Review reads.
 *
 * One call, one aggregate. Every figure comes from review_summary(), which
 * checks the Growth entitlement before it reads anything -- so this service
 * cannot be pointed at a cheaper tenant's data by changing what it asks for.
 *
 * Errors are returned as codes rather than thrown strings: the design's error
 * state is deliberately plain ("We couldn't load your review"), and a Postgres
 * message must never reach it.
 */

interface ReviewSummaryRow {
  period: { from: string; to: string };
  sales_total: number;
  transaction_count: number;
  estimated_profit: number;
  profit_basis_share: number;
  inventory_value: number;
  inventory_basis_share: number;
  product_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  slow_moving_count: number;
  utang_outstanding: number;
  utang_overdue: number;
  customers_with_balance: number;
  overdue_customer_count: number;
  oldest_overdue_days: number;
  best_sellers: { id: string; name: string; revenue: number; quantity: number }[];
}

function mapSummary(row: ReviewSummaryRow): ReviewSummary {
  return {
    period: row.period,
    salesTotal: Number(row.sales_total),
    transactionCount: row.transaction_count,
    estimatedProfit: Number(row.estimated_profit),
    profitBasisShare: Number(row.profit_basis_share),
    inventoryValue: Number(row.inventory_value),
    inventoryBasisShare: Number(row.inventory_basis_share),
    productCount: row.product_count,
    lowStockCount: row.low_stock_count,
    outOfStockCount: row.out_of_stock_count,
    slowMovingCount: row.slow_moving_count,
    utangOutstanding: Number(row.utang_outstanding),
    utangOverdue: Number(row.utang_overdue),
    customersWithBalance: row.customers_with_balance,
    overdueCustomerCount: row.overdue_customer_count,
    oldestOverdueDays: row.oldest_overdue_days,
    bestSellers: (row.best_sellers ?? []).map(
      (b): ReviewBestSeller => ({
        id: b.id,
        name: b.name,
        revenue: Number(b.revenue),
        quantity: b.quantity,
      })
    ),
  };
}

export type FetchReviewResult =
  | { ok: true; summary: ReviewSummary }
  | { ok: false; refused: true }
  | { ok: false; refused: false };

/**
 * `refused` separates "your plan does not include this" from "something went
 * wrong", because they are different screens: the first is the upgrade state,
 * the second is Try again. Anything unrecognised is treated as a failure
 * rather than a refusal -- showing an upgrade prompt after a network blip
 * would tell a paying customer they had been downgraded.
 */
export async function fetchReviewSummary(
  from: string,
  to: string,
  overdueDays: number
): Promise<FetchReviewResult> {
  const { data, error } = await supabase.rpc("review_summary", {
    p_from: from,
    p_to: to,
    p_overdue_days: overdueDays,
  });

  if (error) {
    const refused =
      error.message?.includes("FEATURE_NOT_AVAILABLE") ||
      error.message?.includes("UNAUTHORIZED_ACTION");
    return { ok: false, refused: Boolean(refused) };
  }
  if (!data) return { ok: false, refused: false };

  return { ok: true, summary: mapSummary(data as ReviewSummaryRow) };
}
