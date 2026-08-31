import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FeesLimitsMock {
  printBw: number;
  printColour: number;
  photocopy: number;
  bulkFromPages: number;
  keepInDrawer: number;
  defaultCreditLimit: number;
  cashierCashOutCap: number;
  blockUtangPastLimit: boolean;
  voidNeedsPin: boolean;
  warnLowEloadFloat: boolean;
}

export const DEFAULT_FEES_LIMITS_MOCK: FeesLimitsMock = {
  printBw: 3,
  printColour: 12,
  photocopy: 2,
  bulkFromPages: 10,
  keepInDrawer: 2000,
  defaultCreditLimit: 500,
  cashierCashOutCap: 1000,
  blockUtangPastLimit: false,
  voidNeedsPin: false,
  warnLowEloadFloat: false,
};

const STORAGE_KEY_PREFIX = "tindahan-pos-mobile:fees-limits:";

/**
 * A direct mirror of the web app's feesLimitsMock.ts -- print/photocopy
 * pricing, cash-and-credit limits and their guardrail toggles have no
 * per-store column or enforcement path on either client yet.
 *
 * Landing whole rather than field-by-field even though only
 * warnLowEloadFloat is read today (by the Alerts screen, exactly as the
 * web app's own Alerts page reads it from here): defining half the shape
 * now and the rest in the Fees screen's own PR would mean two migrations
 * of the same AsyncStorage key.
 * TODO: move to real store columns/enforcement once they exist.
 */
export async function loadFeesLimitsMock(storeId: string): Promise<FeesLimitsMock> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_FEES_LIMITS_MOCK;
    const parsed = JSON.parse(raw) as Partial<FeesLimitsMock>;
    return { ...DEFAULT_FEES_LIMITS_MOCK, ...parsed };
  } catch {
    return DEFAULT_FEES_LIMITS_MOCK;
  }
}

export async function saveFeesLimitsMock(storeId: string, settings: FeesLimitsMock): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence -- ignore quota/availability errors.
  }
}
