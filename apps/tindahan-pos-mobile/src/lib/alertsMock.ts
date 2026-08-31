import AsyncStorage from "@react-native-async-storage/async-storage";

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

const STORAGE_KEY_PREFIX = "tindahan-pos-mobile:alerts:";

/**
 * A direct mirror of the web app's alertsMock.ts -- same fields, same
 * defaults, same reason: out-of-stock/drawer/utang-aging/void thresholds,
 * notification channels and quiet hours have no backend column AND no
 * delivery mechanism (there is no push/SMS/email integration in either
 * client), so there is nothing real for them to drive yet.
 *
 * That second half matters more than usual here: unlike the receipt
 * toggles, these describe messages that would be *sent*, so shipping
 * them as if they worked would be a promise the app can't keep. They
 * persist so the operator's intent survives, and nothing more.
 * TODO: move to real store columns/notification service once they exist.
 */
export async function loadAlertsMock(storeId: string): Promise<AlertsMock> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_ALERTS_MOCK;
    const parsed = JSON.parse(raw) as Partial<AlertsMock>;
    return { ...DEFAULT_ALERTS_MOCK, ...parsed };
  } catch {
    return DEFAULT_ALERTS_MOCK;
  }
}

export async function saveAlertsMock(storeId: string, settings: AlertsMock): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence -- ignore quota/availability errors.
  }
}
