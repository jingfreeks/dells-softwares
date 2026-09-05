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

/** One day of the trend series. Days that sold nothing are present, with 0. */
export interface ReviewDailySales {
  date: string;
  sales: number;
}

/**
 * The window the headline figures are compared against.
 *
 * `from`/`to` are returned rather than assumed so the UI can label what was
 * actually compared. A whole calendar month compares against the previous
 * calendar month; anything else against the same-length window before it — so
 * "vs last month" is only the right words some of the time.
 *
 * Only flows are compared. Inventory value and outstanding utang are levels,
 * and a level has no previous period to speak of.
 */
export interface ReviewPreviousPeriod {
  from: string;
  to: string;
  salesTotal: number;
  transactionCount: number;
}

/** A customer past the store's overdue threshold, named so the card is actionable. */
export interface ReviewOverdueCustomer {
  id: string;
  name: string;
  balance: number;
  daysOverdue: number;
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
  dailySales: ReviewDailySales[];

  /**
   * Shifts CLOSED AND COUNTED in the period. A session still open, or
   * abandoned without a closing count, is in neither number — it has nothing
   * to be off by, and reporting it as balanced would turn "nobody counted the
   * drawer" into "no action needed".
   *
   * So `shiftsClosed === 0` means nothing was counted, which is not the same
   * as everything balancing, and the UI must say so differently.
   */
  shiftsClosed: number;
  shiftsOff: number;
  shiftsOffTotal: number;

  overdueCustomers: ReviewOverdueCustomer[];
  previous: ReviewPreviousPeriod;
}

/** What the server said when it refused. */
export type ReviewAccessRefusal = "FEATURE_NOT_AVAILABLE" | "UNAUTHORIZED_ACTION";
