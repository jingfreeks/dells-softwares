export interface FeesLimitsMock {
  printBw: number;
  printColour: number;
  photocopy: number;
  bulkFromPages: number;
  keepInDrawer: number;
  defaultCreditLimit: number;
  blockUtangPastLimit: boolean;
  warnLowEloadFloat: boolean;
}

export const DEFAULT_FEES_LIMITS_MOCK: FeesLimitsMock = {
  printBw: 3,
  printColour: 12,
  photocopy: 2,
  bulkFromPages: 10,
  keepInDrawer: 2000,
  defaultCreditLimit: 500,
  blockUtangPastLimit: false,
  warnLowEloadFloat: false,
};

const STORAGE_KEY_PREFIX = "tindahan-pos:fees-limits:";

/**
 * Print/photocopy pricing, the default credit limit, and the two remaining
 * toggles here have no per-store column or enforcement path yet -- this is
 * a UI-only redesign, so they persist client-side for now.
 * TODO: move to real store columns/enforcement once they exist.
 *
 * "Void needs PIN" and "Cashier cash-out cap" used to live here too. They
 * are real, server-enforced store columns now (stores.void_requires_pin,
 * stores.cashier_cash_out_cap -- see 20260903190000/20260903200000 and
 * useFeesLimitsPage.ts), so they read and save through useAuth()'s
 * store/updateStore like every other real setting on this page, not through
 * this mock.
 */
export function loadFeesLimitsMock(storeId: string): FeesLimitsMock {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_FEES_LIMITS_MOCK;
    const parsed = JSON.parse(raw) as Partial<FeesLimitsMock>;
    return { ...DEFAULT_FEES_LIMITS_MOCK, ...parsed };
  } catch {
    return DEFAULT_FEES_LIMITS_MOCK;
  }
}

export function saveFeesLimitsMock(storeId: string, settings: FeesLimitsMock): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
