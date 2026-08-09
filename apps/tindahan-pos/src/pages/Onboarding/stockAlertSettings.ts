export type StockAlertStrategy = "daysOfCover" | "fixedQuantity";

export interface StockAlertSettings {
  strategy: StockAlertStrategy;
  thresholdDays: number;
  fastMoverBoost: boolean;
  dailySummary: boolean;
}

export const DEFAULT_STOCK_ALERT_SETTINGS: StockAlertSettings = {
  strategy: "daysOfCover",
  thresholdDays: 3,
  fastMoverBoost: true,
  dailySummary: true,
};

const STORAGE_KEY_PREFIX = "tindahan-pos:stock-alert-settings:";

/**
 * There's no backend column/table for these preferences yet (only
 * per-product `lowStockThreshold` exists in Supabase) — this is a UI-only
 * redesign, so settings are persisted client-side for now.
 * TODO: move to a real store-settings table once one exists.
 */
export function loadStockAlertSettings(storeId: string): StockAlertSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + storeId);
    if (!raw) return DEFAULT_STOCK_ALERT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<StockAlertSettings>;
    return { ...DEFAULT_STOCK_ALERT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_STOCK_ALERT_SETTINGS;
  }
}

export function saveStockAlertSettings(storeId: string, settings: StockAlertSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + storeId, JSON.stringify(settings));
  } catch {
    // Best-effort persistence — ignore quota/availability errors.
  }
}
