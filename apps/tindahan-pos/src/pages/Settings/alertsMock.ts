export interface AlertsMock {
  warnOutOfStockImmediately: boolean;
  drawerVarianceThreshold: number;
  utangAgingThresholdDays: number;
  alertOnVoidAfterPayment: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  dailySummaryTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export const DEFAULT_ALERTS_MOCK: AlertsMock = {
  warnOutOfStockImmediately: true,
  drawerVarianceThreshold: 20,
  utangAgingThresholdDays: 30,
  alertOnVoidAfterPayment: true,
  pushEnabled: true,
  smsEnabled: true,
  emailEnabled: false,
  dailySummaryTime: "07:00",
  quietHoursStart: "21:00",
  quietHoursEnd: "06:00",
};

const STORAGE_KEY_PREFIX = "tindahan-pos:alerts:";

/**
 * Out-of-stock/drawer/utang-aging/void thresholds, notification
 * channels, and quiet hours have no backend column or delivery
 * mechanism yet (no push/SMS/email integration exists) — this is a
 * UI-only redesign, so they persist client-side for now.
 * TODO: move to real store columns/notification service once they exist.
 */
export function loadAlertsMock(storeId: string): AlertsMock {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_ALERTS_MOCK;
    const parsed = JSON.parse(raw) as Partial<AlertsMock>;
    return { ...DEFAULT_ALERTS_MOCK, ...parsed };
  } catch {
    return DEFAULT_ALERTS_MOCK;
  }
}

export function saveAlertsMock(storeId: string, settings: AlertsMock): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
