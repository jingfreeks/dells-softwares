import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_THRESHOLD_DAYS, type DenominationCounts } from "./onboarding";

export interface OpeningHours {
  openTime: string;
  closeTime: string;
}

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  openTime: "06:00",
  closeTime: "21:00",
};

export interface StockAlertSettings {
  thresholdDays: number;
  fastMoverBoost: boolean;
  dailySummary: boolean;
}

export const DEFAULT_STOCK_ALERT_SETTINGS: StockAlertSettings = {
  thresholdDays: DEFAULT_THRESHOLD_DAYS,
  fastMoverBoost: true,
  dailySummary: true,
};

/**
 * There's no `stores.open_time`/`close_time`/stock-alert-preference
 * column yet -- these persist client-side for now, mirroring the web
 * app's own localStorage-only approach for the same settings
 * (apps/tindahan-pos/src/pages/Onboarding/openingHoursSettings.ts,
 * stockAlertSettings.ts). AsyncStorage is the mobile equivalent of
 * localStorage, just async.
 * TODO: move to real store columns once they exist.
 */
async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

async function saveJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort persistence -- ignore quota/availability errors.
  }
}

export function loadOpeningHours(storeId: string): Promise<OpeningHours> {
  return loadJson(`tindahan-pos-mobile:opening-hours:${storeId}`, DEFAULT_OPENING_HOURS);
}

export function saveOpeningHours(storeId: string, hours: OpeningHours): Promise<void> {
  return saveJson(`tindahan-pos-mobile:opening-hours:${storeId}`, hours);
}

export function loadStockAlertSettings(storeId: string): Promise<StockAlertSettings> {
  return loadJson(`tindahan-pos-mobile:stock-alert-settings:${storeId}`, DEFAULT_STOCK_ALERT_SETTINGS);
}

export function saveStockAlertSettings(storeId: string, settings: StockAlertSettings): Promise<void> {
  return saveJson(`tindahan-pos-mobile:stock-alert-settings:${storeId}`, settings);
}

export function loadDenominationCounts(storeId: string): Promise<DenominationCounts> {
  return loadJson(`tindahan-pos-mobile:starting-cash:${storeId}`, {} as DenominationCounts);
}

export function saveDenominationCounts(storeId: string, counts: DenominationCounts): Promise<void> {
  return saveJson(`tindahan-pos-mobile:starting-cash:${storeId}`, counts);
}
