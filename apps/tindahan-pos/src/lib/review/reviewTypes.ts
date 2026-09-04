/**
 * Review domain types.
 *
 * Shaped to match review_summary()'s payload exactly, because the figures are
 * computed server-side on purpose: a client that fetches the rows and adds
 * them up has already been handed the rows, and Starter must be refused
 * before any Review data crosses the boundary.
 *
 * Note what is NOT here: expenses. The design shows the metric, this schema
 * has no expenses table, and the RPC deliberately omits the key rather than
 * return a fabricated figure. Adding it here would invite a card that renders
 * `undefined` as ₱0.
 */

export interface ReviewBestSeller {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
}

export interface ReviewSummary {
  period: { from: string; to: string };

  salesTotal: number;
  transactionCount: number;

  /**
   * Recomputed against each product's CURRENT cost, because sale_items never
   * captured a cost snapshot. Always read alongside profitBasisShare.
   */
  estimatedProfit: number;
  /**
   * The fraction of sold value whose product has a cost at all, 0–1.
   * Presenting estimatedProfit without this overstates what is known.
   */
  profitBasisShare: number;

  inventoryValue: number;
  inventoryBasisShare: number;
  productCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  slowMovingCount: number;

  utangOutstanding: number;
  utangOverdue: number;
  customersWithBalance: number;
  overdueCustomerCount: number;
  oldestOverdueDays: number;
  /**
   * The threshold these overdue figures were computed against — the store's
   * own setting unless the caller asked for another. Returned so the UI can
   * label the number with the rule behind it rather than assuming 30.
   */
  overdueDays: number;

  bestSellers: ReviewBestSeller[];
}

/** What the server said when it refused. */
export type ReviewAccessRefusal = "FEATURE_NOT_AVAILABLE" | "UNAUTHORIZED_ACTION";
