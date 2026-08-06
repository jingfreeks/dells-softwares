export interface RecentPayment {
  id: string;
  customerName: string;
  whenLabel: string;
  method: string;
  status: string;
  amount: number;
}

/**
 * TODO: replace with a real "recent payments across all customers" query
 * once the backend exposes one — `fetchCreditPayments` only returns a
 * single customer's history, and `credit_payments` has no payment-method
 * or settlement-status column yet, so a global feed can't be built from
 * real data today.
 */
export const MOCK_RECENT_PAYMENTS: RecentPayment[] = [
  { id: "mock-1", customerName: "Tita Malou", whenLabel: "2 days ago", method: "Cash", status: "settled", amount: 420 },
  { id: "mock-2", customerName: "Kuya Jun", whenLabel: "3 days ago", method: "GCash", status: "partial", amount: 500 },
  { id: "mock-3", customerName: "Ate Lorna", whenLabel: "5 days ago", method: "Cash", status: "partial", amount: 300 },
  { id: "mock-4", customerName: "Mang Tonyo", whenLabel: "6 days ago", method: "Cash", status: "partial", amount: 200 },
];
