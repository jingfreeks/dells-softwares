export interface AlertsMock {
  warnOutOfStockImmediately: boolean;
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
 * The out-of-stock and void-alert toggles, notification channels, and quiet
 * hours have no backend column or delivery mechanism yet (no push/SMS/email
 * integration exists) — this is a UI-only redesign, so they persist
 * client-side for now.
 * TODO: move to real store columns/notification service once they exist.
 *
 * The drawer-variance and utang-ageing thresholds USED to live here. They are
 * real store columns now (stores.drawer_variance_threshold,
 * stores.utang_overdue_days -- see 20260905100000), because Review and the
 * Customers ageing view both read them from the server and a per-device copy
 * is what let those two screens disagree about the same customers.
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
