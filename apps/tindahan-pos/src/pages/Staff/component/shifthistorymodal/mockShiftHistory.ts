export interface ShiftHistoryEntry {
  id: string;
  date: string;
  cashier: string;
  opening: number;
  closing: number;
  variance: number;
  sales: number;
  transactions: number;
  status: string;
}

/**
 * TODO: replace with a real query once shift open/close is tracked
 * (see lib/drawerFloat — no shift table exists yet).
 */
export const MOCK_SHIFT_HISTORY: ShiftHistoryEntry[] = [
  { id: "mock-1", date: "Aug 5", cashier: "Maricel Reyes", opening: 2000, closing: 3175, variance: -40, sales: 4820, transactions: 37, status: "Shift completed" },
  { id: "mock-2", date: "Aug 4", cashier: "Jerome Tan", opening: 2000, closing: 2000, variance: 0, sales: 0, transactions: 0, status: "Shift completed" },
  { id: "mock-3", date: "Aug 3", cashier: "Maricel Reyes", opening: 2000, closing: 3410, variance: 0, sales: 5210, transactions: 41, status: "Shift completed" },
];
